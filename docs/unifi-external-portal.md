# Configuração do Portal Captivo — UniFi (External Hotspot)

Guia para configurar o **External Portal / External Hotspot** no UniFi Network
apontando para este portal captivo.

---

## Visão Geral

Ao habilitar o **Hotspot com portal externo**, o UniFi redireciona o navegador do
cliente para a URL deste portal, passando na query string os dados da conexão
(MAC do cliente, MAC do AP, SSID, etc.).

Diferente do Aruba (que usa RADIUS), a liberação do UniFi é feita **diretamente pela
API do controlador**: após o login/voucher no portal, o sistema chama
`authorize-guest` no controlador UniFi para o MAC do cliente. Por isso é essencial que
o MAC chegue corretamente no redirect.

> **Ponto crítico:** o UniFi envia o MAC do **cliente** no parâmetro **`id`** (e o MAC
> do **AP** em `ap`). O portal lê o `id` como MAC do cliente.

---

## Pré-requisitos

| Requisito | Descrição |
|-----------|-----------|
| Controlador UniFi acessível | O portal (servidor) precisa alcançar o controlador via HTTPS (UDM/Cloud Key/self-hosted) |
| Credenciais de admin | Usuário/senha (login local) OU API Key (UniFi Cloud) com permissão de escrita |
| HTTPS no portal | Domínio do portal com certificado SSL válido |
| Rede/SSID de Guest | SSID com Hotspot habilitado |
| Pré-autorização (Walled Garden) | O domínio do portal liberado antes do login |

---

## Passo a Passo no UniFi Network

| # | Onde | O que fazer |
|---|------|-------------|
| 1 | Settings → Hotspot (Guest Hotspot) | Habilite o Hotspot na rede/SSID de convidados |
| 2 | Authentication / Landing Page | Escolha **External Portal Server** (portal externo) |
| 3 | URL do portal externo | Informe o domínio do portal (ver abaixo) |
| 4 | Pre-authorization / Walled Garden | Libere o domínio do portal + `fonts.googleapis.com`, `fonts.gstatic.com` |
| 5 | Salvar | Aplique as alterações |
| 6 | Portal (admin deste sistema) → Controlador | Configure UniFi (URL/usuário/senha ou API Key) e teste a conexão |

---

## URL do Portal (External Portal Server)

O endpoint canônico do External Hotspot é `/guest/s/<site>/`. Este sistema atende esse
path (além de `/` e `/portal`, que são equivalentes):

```
https://SEU-DOMINIO/guest/s/default/
```

Exemplo:

```
https://wifi-captive.catalao.mti.app.br/guest/s/default/
```

O identificador `default` corresponde ao **site** do UniFi e pode variar. A autorização e
a sessão usam sempre o **site configurado no admin** deste portal (não o valor do path,
que é controlado pelo cliente).

---

## Configuração do Controlador (no admin deste portal)

A liberação do cliente é feita pela API do UniFi. No painel admin → Controlador,
configure **um** dos modos:

| Modo | Campos | Observação |
|------|--------|-----------|
| UniFi local | URL do controlador, usuário, senha, site | Login por cookie; aceita certificado auto-assinado |
| UniFi Cloud | API Key da conta, console, site | API Key no nível da **conta** (unifi.ui.com → Settings → API), gerada pelo **owner** do console |

Use o botão **Testar conexão** e a ferramenta de **autorizar MAC de teste** para validar
de ponta a ponta antes de colocar em produção.

---

## Parâmetros enviados pelo UniFi

Formato do redirect:

```
https://SEU-DOMINIO/guest/s/default/?ap=AA:BB:CC:DD:EE:FF&id=11:22:33:44:55:66&t=1756980000&url=http%3A%2F%2Fgoogle.com%2F&ssid=WiFi%20Guest
```

| Parâmetro | Descrição | Uso no sistema |
|-----------|-----------|----------------|
| `ap` | MAC do Access Point | Gravado na sessão (`apName`) para auditoria |
| `id` | **MAC do cliente** | MAC alvo do `authorize-guest` (normalizado) |
| `t` | Timestamp da requisição | Informativo |
| `url` | URL original solicitada | Só usada no redirect pós-login se o admin **não** definiu `successRedirectUrl` (config tem prioridade; validado: só http/https) |
| `ssid` | Nome do SSID | Exibido no portal e gravado na sessão |

> O parâmetro `id` é tratado como **dado do cliente**, não como prova de autenticação. A
> liberação só ocorre após login/voucher válido e a chamada autenticada ao controlador.

---

## Checklist de Configuração

1. Habilitar Hotspot no SSID de convidados e escolher **External Portal Server**
2. Definir a URL: `https://SEU-DOMINIO/guest/s/default/`
3. Liberar o domínio do portal na pré-autorização/Walled Garden (incluindo DNS)
4. Confirmar SSL ativo no domínio do portal
5. No admin deste portal, configurar e **testar** o controlador (local ou Cloud)
6. Conectar um celular no SSID de convidados e validar o fluxo

---

## Como Validar

1. Conecte um dispositivo na rede de convidados — o UniFi abre o portal
2. Confirme que o portal exibe `Rede: <SSID>` e **não** mostra o aviso "MAC não detectado"
3. Faça login/insira o voucher
4. Acompanhe no admin → **Logs de Acesso ao Portal**: o registro deve vir com a tag
   `UniFi`, o `mac` (vindo do `id`) e o `ap` preenchidos
5. Confirme no controlador que o MAC recebeu autorização de convidado

Simulação manual do redirect (útil em dev):

```
GET /guest/s/default/?ap=94:2A:6F:D0:30:57&id=1C:71:25:63:E4:24&t=1742398732&url=http%3A%2F%2Fgoogle.com%2F&ssid=WiFi%20Guest
```

---

## Solução de Problemas

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Portal abre com "MAC não detectado" | Redirect sem `id` (Hotspot mal configurado) | Confirmar External Portal habilitado no SSID e o path `/guest/s/<site>/` |
| Portal não abre / tela em branco | Domínio fora do Walled Garden | Liberar domínio do portal + DNS na pré-autorização |
| Erro de certificado | HTTPS não configurado no portal | Confirmar SSL ativo no domínio |
| Loga no portal mas não libera | Controlador não configurado/inacessível | Testar conexão no admin; garantir que o servidor alcança o controlador |
| "Access denied" / 401/403 ao autorizar | Credenciais/API Key sem permissão | Usar conta admin (local) ou API Key do owner (Cloud) |
| Log não aparece no admin | UniFi não está redirecionando | Confirmar modo External Portal Server no SSID de convidados |

---

## Observações Importantes

- O MAC do cliente vem em **`id`**; o MAC do AP vem em **`ap`**.
- A autorização é feita pela **API do controlador UniFi** (local ou Cloud), não por RADIUS.
- As rotas `/`, `/portal` e `/guest/s/<site>/` são equivalentes no sistema.
- Use sempre HTTPS no portal e mantenha o domínio idêntico na URL e no Walled Garden.
