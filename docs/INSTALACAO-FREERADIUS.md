# Manual de Instalação do FreeRADIUS (Aruba Instant On + Portal)

Manual completo, passo a passo, para instalar e configurar o **FreeRADIUS** em
uma VPS **Ubuntu/Debian**, integrado ao portal cativo hospedado em
`https://portal.centerent.inf.br`.

Ao final, o login por e-mail/senha e por voucher do portal será validado via
RADIUS, eliminando o erro `404 captive portal not find ecp config`.

---

## Sumário

1. [Como funciona (visão geral)](#1-como-funciona-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Segredos que você vai usar](#3-segredos-que-você-vai-usar)
4. [Passo 1 — Instalar o FreeRADIUS](#passo-1--instalar-o-freeradius)
5. [Passo 2 — Liberar o firewall](#passo-2--liberar-o-firewall)
6. [Passo 3 — Registrar o AP como cliente](#passo-3--registrar-o-ap-como-cliente)
7. [Passo 4 — Configurar o módulo REST](#passo-4--configurar-o-módulo-rest)
8. [Passo 5 — Ativar o REST no fluxo de autenticação](#passo-5--ativar-o-rest-no-fluxo-de-autenticação)
9. [Passo 6 — Configurar o Aruba Instant On](#passo-6--configurar-o-aruba-instant-on)
10. [Passo 7 — Testar](#passo-7--testar)
11. [Passo 8 — Ativar em produção](#passo-8--ativar-em-produção)
12. [Solução de problemas](#solução-de-problemas)
13. [Comandos úteis](#comandos-úteis)

---

## 1. Como funciona (visão geral)

```
1. Convidado conecta na rede Guest e é redirecionado para o portal (este app).
2. Convidado faz login (e-mail/senha) ou informa um voucher.
3. O app valida no banco (Neon) e gera um TOKEN de uso único.
4. O navegador é enviado ao AP:  /cgi-bin/login?user=TOKEN&password=TOKEN
5. O AP envia user/password (o TOKEN) ao FreeRADIUS via UDP 1812.
6. O FreeRADIUS chama o endpoint REST do app:  /api/radius/authorize
7. O app confere o token e responde Access-Accept (com Session-Timeout) ou Reject.
8. O AP libera a internet. Sem 404.
```

> **Por que precisa de uma VPS?** O RADIUS usa UDP (portas 1812/1813), que
> funções serverless (Vercel) não conseguem escutar. Por isso o FreeRADIUS roda
> na sua VPS e conversa com o app por HTTPS.

---

## 2. Pré-requisitos

- VPS com **Ubuntu 20.04+ ou Debian 11+** e acesso `sudo`.
- A VPS precisa ter um **IP público** alcançável pelo seu AP/rede.
- O AP Aruba Instant On precisa **enxergar a VPS** nas portas UDP 1812/1813.
- O portal já publicado e acessível em `https://portal.centerent.inf.br`
  (com certificado HTTPS válido).
- A variável `RADIUS_REST_SECRET` já cadastrada no projeto (Vercel).

---

## 3. Segredos que você vai usar

São **dois segredos diferentes**. Não os confunda:

| Nome | Onde é usado | Como obter |
|------|--------------|------------|
| **`RADIUS_REST_SECRET`** | Entre o FreeRADIUS e o app (passo 4) | Já está no projeto Vercel. Use o mesmo valor. |
| **Shared Secret RADIUS** | Entre o AP e o FreeRADIUS (passos 3 e 6) | Gere agora um valor novo e forte. |

Gere o Shared Secret RADIUS:

```bash
openssl rand -base64 24
```

Guarde o resultado — ele será usado igual no `clients.conf` (passo 3) e no
painel Instant On (passo 6).

---

## Passo 1 — Instalar o FreeRADIUS

```bash
sudo apt update
sudo apt install -y freeradius freeradius-utils
```

Confirme a versão instalada:

```bash
freeradius -v
```

> Os arquivos de configuração ficam em `/etc/freeradius/3.0/`.
> Se o seu pacote usar outra versão (ex.: 3.2), ajuste o caminho conforme necessário.

---

## Passo 2 — Liberar o firewall

```bash
sudo ufw allow 1812/udp
sudo ufw allow 1813/udp
sudo ufw reload
```

> Se você não usa UFW, libere as portas UDP 1812 e 1813 no firewall da sua VPS
> e/ou no painel do provedor (Security Group / Firewall de borda).

---

## Passo 3 — Registrar o AP como cliente

Edite o arquivo de clientes:

```bash
sudo nano /etc/freeradius/3.0/clients.conf
```

Adicione no final (substitua os valores em MAIÚSCULAS):

```
client aruba_instanton {
    ipaddr    = IP_PUBLICO_DO_SEU_AP
    secret    = SEU_SHARED_SECRET_RADIUS
    shortname = instanton
    nastype   = other
}
```

- `ipaddr`: IP público pelo qual o AP chega até a VPS. Se ainda não souber,
  rode o teste em debug (passo 7) e veja o IP de origem nos logs.
- `secret`: o **Shared Secret RADIUS** gerado no passo 3.

> Se você tiver vários APs atrás do mesmo IP público, um único bloco `client`
> com esse IP cobre todos.

---

## Passo 4 — Configurar o módulo REST

O módulo `rlm_rest` já vem incluído. Edite:

```bash
sudo nano /etc/freeradius/3.0/mods-available/rest
```

Localize o bloco `rest { ... }` e ajuste `connect_uri` e a seção `authorize`:

```
rest {
    connect_uri = "https://portal.centerent.inf.br"

    authorize {
        uri    = "${..connect_uri}/api/radius/authorize"
        method = 'post'
        body   = 'json'
        data   = '{ "username": "%{User-Name}", "password": "%{User-Password}", "secret": "SEU_RADIUS_REST_SECRET" }'
        tls {
            check_cert    = yes
            check_cert_cn = yes
        }
    }
}
```

- Troque `SEU_RADIUS_REST_SECRET` pelo valor **exato** da variável
  `RADIUS_REST_SECRET` do projeto Vercel.
- Mantenha `check_cert = yes` (o portal tem HTTPS válido).

Ative o módulo (cria o link em `mods-enabled`):

```bash
sudo ln -s /etc/freeradius/3.0/mods-available/rest /etc/freeradius/3.0/mods-enabled/rest
```

---

## Passo 5 — Ativar o REST no fluxo de autenticação

Edite o site padrão:

```bash
sudo nano /etc/freeradius/3.0/sites-available/default
```

**Na seção `authorize { ... }`**, adicione perto do fim (antes do fechamento `}`):

```
    rest
    if (ok || updated) {
        update control {
            Auth-Type := rest
        }
    }
```

**Na seção `authenticate { ... }`**, adicione:

```
    Auth-Type rest {
        rest
    }
```

Salve e valide a sintaxe da configuração:

```bash
sudo freeradius -CX
```

Deve terminar com `Configuration appears to be OK`.

---

## Passo 6 — Configurar o Aruba Instant On

No app/portal web do Instant On:

1. Vá em **Redes → (sua rede Guest) → Portal do convidado → Autenticação**.
2. Selecione **"Autenticação de Convidado (padrão)"**.
   - **NÃO** use "Confirmação do Portal de Convidados" — é esse modo que gera o 404.
3. Configure o **Portal Captivo Externo** apontando para `https://portal.centerent.inf.br`.
4. Em **Servidor RADIUS**, preencha:
   - **Servidor:** `IP_DA_SUA_VPS`
   - **Porta de autenticação:** `1812`
   - **Porta de accounting:** `1813`
   - **Segredo compartilhado:** o mesmo **Shared Secret RADIUS** do passo 3.
5. Confirme que `portal.centerent.inf.br` está em **Domínios permitidos** (walled garden).
6. Salve.

---

## Passo 7 — Testar

### 7a. Teste em modo debug (recomendado)

Pare o serviço e rode em primeiro plano para ver cada requisição:

```bash
sudo systemctl stop freeradius
sudo freeradius -X
```

Conecte um celular na rede Guest, faça login no portal e observe o terminal.
Você deve ver um `Access-Accept` ao final do processamento. Os logs também
mostram o **IP de origem do AP** — use-o para ajustar o `clients.conf` (passo 3)
caso ainda não soubesse.

### 7b. Teste manual com um token

Gere um login no portal (para criar um token válido), pegue o token e rode:

```bash
radtest TOKEN TOKEN localhost 1812 SEU_SHARED_SECRET_RADIUS
```

Resposta esperada: `Received Access-Accept`.

---

## Passo 8 — Ativar em produção

Quando os testes passarem, encerre o modo debug (Ctrl+C) e ative o serviço para
iniciar com o sistema:

```bash
sudo systemctl start freeradius
sudo systemctl enable freeradius
sudo systemctl status freeradius
```

---

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Ainda aparece "404 ecp config" | Rede Guest ainda em "Confirmação do Portal" | Troque para "Autenticação de Convidado (padrão)" (passo 6) |
| `Access-Reject` sempre | Token expirado ou `RADIUS_REST_SECRET` divergente | Confira o `secret` no módulo `rest` (passo 4) e gere um novo login |
| FreeRADIUS não recebe nada | IP do cliente ou shared secret errado, ou firewall | Veja o IP de origem no debug (`freeradius -X`), ajuste `clients.conf` e libere UDP 1812 |
| `check_cert` falha / erro TLS | Certificado HTTPS do portal inválido | Garanta certificado válido em `portal.centerent.inf.br` |
| `radtest` dá timeout | Serviço parado ou porta bloqueada | Verifique `systemctl status freeradius` e o firewall |
| Erro de sintaxe ao iniciar | Edição incorreta nos arquivos | Rode `sudo freeradius -CX` para ver a linha do erro |

---

## Comandos úteis

```bash
# Validar configuração sem iniciar
sudo freeradius -CX

# Rodar em modo debug (verboso, primeiro plano)
sudo freeradius -X

# Reiniciar / status do serviço
sudo systemctl restart freeradius
sudo systemctl status freeradius

# Ver logs do serviço
sudo journalctl -u freeradius -f

# Testar autenticação (token gerado pelo portal)
radtest TOKEN TOKEN localhost 1812 SEU_SHARED_SECRET_RADIUS
```

---

## Contrato do endpoint REST (referência)

`POST https://portal.centerent.inf.br/api/radius/authorize`

Request (JSON):

```json
{ "username": "<token>", "password": "<token>", "secret": "<RADIUS_REST_SECRET>" }
```

> O segredo também pode ir no header `x-radius-secret`.

| Status retornado | Significado para o FreeRADIUS |
|------------------|-------------------------------|
| `200` + atributos JSON | Access-Accept (inclui `Session-Timeout` em segundos) |
| `401` | Access-Reject (token inválido/expirado) |
| `403` | Shared secret REST incorreto |
| `500` | `RADIUS_REST_SECRET` não configurado no app |

### Segurança

- O token é de **uso único** e expira em ~10 minutos; a senha real do usuário
  nunca trafega na URL.
- O endpoint só aceita se o `RADIUS_REST_SECRET` bater.
- Mantenha o FreeRADIUS atrás de firewall, aceitando RADIUS apenas do seu AP.
