# Autenticação via RADIUS (Aruba Instant On)

Este guia configura o portal para usar **autenticação RADIUS**, que é o modo
confiável e instantâneo recomendado pela HPE — em vez do modo "Confirmação do
Portal de Convidados" (Acknowledge), que causava o erro `404 captive portal not
find ecp config`.

## Visão geral do fluxo

```
1. Usuário conecta na rede Guest e é redirecionado para o portal (este app).
2. Usuário faz login (e-mail/senha) ou usa um voucher.
3. O app valida no banco (Neon) e gera um TOKEN de uso único (tabela radius_tokens).
4. O navegador é redirecionado para o AP: /cgi-bin/login?user=TOKEN&password=TOKEN
5. O AP envia user/password (o token) para o FreeRADIUS (UDP 1812).
6. O FreeRADIUS chama o endpoint REST deste app (/api/radius/authorize).
7. O app valida o token e responde Access-Accept (ou Reject).
8. O AP libera o acesso à internet. Sem 404.
```

> Por que RADIUS e não a Vercel direto? RADIUS usa UDP (portas 1812/1813), que
> funções serverless (Vercel) não conseguem escutar. Por isso o FreeRADIUS roda
> na sua VPS e fala com o app por HTTPS (REST).

## 1. Configuração no Aruba Instant On

No app Instant On / portal web:

1. **Redes → (sua rede Guest) → Portal do convidado → Autenticação**
2. Selecione **"Autenticação de Convidado (padrão)"** (NÃO "Confirmação do Portal de Convidados").
3. Configure o **Portal Captivo Externo** apontando para a URL do seu portal
   (ex: `https://portal.centerent.inf.br`).
4. Em **Servidor RADIUS**, aponte para o IP público da sua VPS:
   - Servidor: `IP_DA_SUA_VPS`
   - Porta de autenticação: `1812`
   - Porta de accounting: `1813`
   - Segredo compartilhado (shared secret): defina um valor forte — o MESMO que
     você colocará no FreeRADIUS (`clients.conf`).
5. Mantenha `portal.centerent.inf.br` em **Domínios permitidos** (walled garden).

## 2. Instalar o FreeRADIUS na VPS

Em uma VPS Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install -y freeradius freeradius-utils
```

Verifique que as portas UDP 1812/1813 estão liberadas no firewall e acessíveis
pelo IP público do seu AP/rede.

## 3. Registrar o AP como cliente RADIUS

Edite `/etc/freeradius/3.0/clients.conf` e adicione:

```
client aruba_instanton {
    ipaddr      = IP_PUBLICO_DO_SEU_AP   # ou a faixa da rede, ex: 0.0.0.0/0 (menos seguro)
    secret      = O_MESMO_SHARED_SECRET_DO_INSTANT_ON
    shortname   = instanton
    nastype     = other
}
```

## 4. Habilitar o módulo REST

O `rlm_rest` já vem com o FreeRADIUS. Edite `/etc/freeradius/3.0/mods-available/rest`:

```
rest {
    connect_uri = "https://portal.centerent.inf.br"

    authorize {
        uri        = "${..connect_uri}/api/radius/authorize"
        method     = 'post'
        body       = 'json'
        data       = '{ "username": "%{User-Name}", "password": "%{User-Password}", "secret": "SEU_RADIUS_REST_SECRET" }'
        tls {
            check_cert      = yes
            check_cert_cn   = yes
        }
    }
}
```

> `SEU_RADIUS_REST_SECRET` deve ser exatamente o valor da variável de ambiente
> `RADIUS_REST_SECRET` configurada no projeto Vercel. É um segredo DIFERENTE do
> shared secret RADIUS do passo 3.

Ative o módulo:

```bash
sudo ln -s /etc/freeradius/3.0/mods-available/rest /etc/freeradius/3.0/mods-enabled/rest
```

## 5. Chamar o REST no fluxo de autorização

Edite o site padrão `/etc/freeradius/3.0/sites-available/default`.

Na seção `authorize { ... }`, adicione `rest` e force o tipo de Auth para REST:

```
authorize {
    ...
    rest
    if (ok || updated) {
        update control {
            Auth-Type := rest
        }
    }
}
```

Na seção `authenticate { ... }`, adicione:

```
authenticate {
    ...
    Auth-Type rest {
        rest
    }
}
```

## 6. Reiniciar e testar

```bash
# Teste em modo debug (mostra cada Access-Request):
sudo systemctl stop freeradius
sudo freeradius -X

# Em outro terminal, simule uma requisição com um token válido gerado pelo portal:
radtest TOKEN_GERADO TOKEN_GERADO localhost 0 testing123
```

Se tudo estiver certo você verá `Access-Accept` no log. Depois reative o serviço:

```bash
sudo systemctl start freeradius
```

## 7. Variáveis de ambiente do app

| Variável | Onde | Descrição |
|----------|------|-----------|
| `RADIUS_REST_SECRET` | Projeto Vercel | Segredo entre o FreeRADIUS e o endpoint REST. Já configurado. |
| `DATABASE_URL` | Projeto Vercel | Conexão com o Neon (já existente). |

## Contrato do endpoint REST

`POST /api/radius/authorize`

Request (JSON, form-urlencoded ou query string):

```json
{ "username": "<token>", "password": "<token>", "secret": "<RADIUS_REST_SECRET>" }
```

(O segredo também pode ir no header `x-radius-secret`.)

Respostas:

| Status | Significado para o FreeRADIUS |
|--------|-------------------------------|
| 200 + atributos JSON | Access-Accept (inclui `Session-Timeout`) |
| 401 | Access-Reject (token inválido/expirado) |
| 403 | Segredo REST incorreto |
| 500 | `RADIUS_REST_SECRET` não configurado no servidor |

## Observações de segurança

- O token é de **uso único** e expira em ~10 minutos. A senha real do usuário
  nunca trafega na URL do redirect.
- O endpoint só responde com Access-Accept se o `RADIUS_REST_SECRET` bater.
- Mantenha o FreeRADIUS atrás de firewall, aceitando RADIUS apenas do seu AP.

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Ainda aparece "404 ecp config" | Rede Guest ainda em modo "Confirmação" | Troque para "Autenticação de Convidado (padrão)" (passo 1) |
| Access-Reject sempre | Token expirado, ou `RADIUS_REST_SECRET` divergente | Verifique o segredo no `rest` e gere novo login |
| FreeRADIUS não recebe nada | Shared secret ou IP do cliente errado | Confira `clients.conf` (passo 3) e firewall UDP 1812 |
| `check_cert` falha | Certificado TLS do portal inválido | Garanta HTTPS válido no domínio do portal |
