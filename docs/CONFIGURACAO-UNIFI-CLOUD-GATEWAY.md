# Configuração — UniFi Cloud (API oficial) + Portal CenterNet

Guia para o portal CenterNet hospedado na Vercel (`portal.centernet.inf.br`)
integrado a um console UniFi (UCG / UDM) via **API oficial da nuvem** (`api.ui.com`),
sem túnel/VPN e sem abrir portas no gateway do colégio.

> Este guia cobre o **modo UniFi Cloud** (autenticação por **API Key**), que é o
> usado atualmente. Ele substitui o antigo fluxo por usuário/senha + porta 443.

---

## Visão geral do fluxo

```
Visitante conecta no WiFi Guest
        ↓
UDM detecta cliente não autorizado
        ↓
UDM redireciona para o Portal Externo (precisa de um IPv4 fixo)
        ↓
Reverse proxy (AWS Elastic IP)  →  portal.centernet.inf.br (Vercel)
        ↓
Visitante faz login / usa voucher
        ↓
Portal chama api.ui.com (Connector Proxy) e autoriza o MAC
        ↓
Visitante navega normalmente
```

Há **duas metades independentes**:

1. **Autorização (portal → controladora):** já funciona via API key na nuvem.
   Validada pelo botão **"Testar credenciais"** na aba Controladora.
2. **Redirecionamento (UDM → portal):** exige um **IPv4 fixo** no campo
   "External Portal Server" do UDM — ver a seção do reverse proxy abaixo.

---

## Parte A — Configuração no Portal CenterNet (já concluída)

Acesse `https://portal.centernet.inf.br/admin` → aba **Controladora** → seção
**UniFi Cloud (API oficial)**.

| Campo | Valor |
|-------|-------|
| API Key | Gerada em `unifi.ui.com → Settings → Control Plane → Integrations / API` |
| Console | Selecionar via **Buscar consoles** (ex.: `CMD - UCG Ultra`) |
| Site | Selecionar via **Buscar sites** (ex.: `Default`) |

Clique em **Testar credenciais** → deve retornar
*"Credenciais válidas — Conexão estabelecida com sucesso"*. Depois **Salvar configuração**.

> A API Key é criptografada em repouso (`SETTINGS_ENC_KEY`) e nunca retorna ao navegador.

---

## Parte B — Por que é preciso um IPv4 fixo (reverse proxy)

O campo **External Portal Server** do UDM só aceita **endereço IPv4**
(rejeita FQDN com *"Please enter a valid IPv4 address"*). Mas a Vercel usa IPs
compartilhados e mutáveis — não há IPv4 estável para apontar diretamente.

**Solução:** um ponto de entrada com **IPv4 público fixo** (AWS EC2 + Elastic IP)
rodando um reverse proxy (Caddy em Docker) que encaminha para o portal na Vercel,
preservando os parâmetros `mac`, `ap`, `ssid` e `url`. Esse IP fixo é o que vai
no campo do UDM.

Os arquivos prontos estão em [`deploy/captive-portal-proxy/`](../deploy/captive-portal-proxy/).

### B.1 — Subir a instância AWS

- EC2 pequena (`t4g.nano`/`t3.micro`), Amazon Linux 2023 ou Ubuntu.
- Alocar um **Elastic IP** e associar à instância → este é o IPv4 fixo.
- **Security Group** (inbound):
  - `80/TCP` — de preferência restrito ao IP público do UDM do colégio.
  - `22/TCP` — apenas do seu IP de administração.

### B.2 — Instalar Docker e subir o proxy

```bash
sudo yum install -y docker || sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# copie a pasta deploy/captive-portal-proxy/ para o servidor, entre nela e suba:
sudo docker-compose up -d
```

### B.3 — Testar o proxy (do seu PC)

```bash
curl -I "http://<ELASTIC_IP>/guest/s/default/?mac=aa:bb:cc:dd:ee:ff&ap=test&ssid=test"
```

Deve responder `200` com o conteúdo do portal.

---

## Parte C — Configuração no UDM (unifi.ui.com → console → Settings)

### C.1 — Rede WiFi Guest

**Settings → WiFi → Create New WiFi Network**

| Campo | Valor |
|-------|-------|
| Name | `CenterNet-Guest` |
| Password | Em branco (Open) |
| Network / Type | **Guest** |

### C.2 — Hotspot Portal

**Settings → WiFi → CenterNet-Guest → Hotspot** (ou **Settings → Hotspot Portal**)

| Campo | Valor |
|-------|-------|
| Hotspot / Landing Page | ✅ **Enable** (por padrão vem *disabled*) |
| Método | **External Portal Server** (em *One Way Methods*) |
| External Portal | `<ELASTIC_IP>` — o IPv4 fixo da AWS |

> É aqui que o IPv4 é obrigatório. Use o Elastic IP, não o domínio.

### C.3 — Pre-Authorization Access (walled garden)

**Hotspot → Pre-Authorization Access** — liberar o acesso antes do login:

| Tipo | Valor |
|------|-------|
| IPv4 | `<ELASTIC_IP>` |

> Como o visitante permanece no IP do proxy durante o login, liberar esse IPv4
> é suficiente. DNS para guests normalmente já vem liberado no UDM.

---

## Parte D — Teste do fluxo completo

1. Alguém no colégio conecta um celular na rede **CenterNet-Guest**.
2. O UDM redireciona para `http://<ELASTIC_IP>/guest/s/default/?mac=...`.
3. O proxy entrega o portal; o visitante faz login / usa voucher.
4. O portal autoriza o MAC via `api.ui.com`.
5. Acompanhe cada redirecionamento em tempo real em
   **Admin → Controladora → Logs de Acesso ao Portal**.

---

## Checklist

| # | Item | Status |
|---|------|--------|
| 1 | API Key criada em unifi.ui.com | ☐ |
| 2 | Console + Site selecionados no portal | ☐ |
| 3 | "Testar credenciais" → verde | ☐ |
| 4 | EC2 + Elastic IP no ar | ☐ |
| 5 | Proxy Caddy respondendo em `http://<ELASTIC_IP>` | ☐ |
| 6 | Rede WiFi Guest (Open) criada | ☐ |
| 7 | Hotspot/Landing Page **habilitado** | ☐ |
| 8 | External Portal = Elastic IP | ☐ |
| 9 | Elastic IP em Pre-Authorization Access | ☐ |
| 10 | Teste real: celular → login → acesso | ☐ |

---

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| "Please enter a valid IPv4 address" no UDM | Campo só aceita IPv4 | Usar o Elastic IP do proxy (Parte B) |
| Portal não abre no celular | Landing Page desabilitada ou IP fora do walled garden | Habilitar Hotspot e liberar o IP em Pre-Auth |
| "Buscar sites" retorna vazio | Timeout transitório do Connector Proxy (408) | Tentar de novo — o portal já re-tenta automaticamente |
| Login funciona mas não libera | Autorização falhou na nuvem | Rever API Key/console/site com "Testar credenciais" |
| Erro de certificado no celular | Acesso por IP cru em HTTPS | O proxy serve por HTTP na 80; usar subdomínio + HTTPS se o firmware permitir |

---

## Observação de segurança

No trecho **UDM → proxy** o tráfego é HTTP (IP cru não permite TLS confiável).
O trecho **proxy → Vercel** é HTTPS. Para elevar a segurança de ponta a ponta,
é possível usar um subdomínio (ex.: `wifi.centernet.inf.br`) apontando para o
Elastic IP com HTTPS válido no próprio Caddy — mas isso depende de o firmware do
UDM aceitar domínio no campo External Portal (hoje ele exige IPv4).

---

*CenterNet — Portal Captivo WiFi — modo UniFi Cloud (API oficial)*
