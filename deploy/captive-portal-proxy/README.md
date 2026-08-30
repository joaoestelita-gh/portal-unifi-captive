# Captive Portal Proxy (AWS Elastic IP → Vercel)

Reverse proxy para o captive portal do UniFi. O campo **External Portal Server**
do UDM só aceita **IPv4**, e a Vercel não oferece IP fixo — então este proxy
roda numa instância com **Elastic IP** e encaminha o visitante para
`portal.centernet.inf.br`, preservando `mac`, `ap`, `ssid` e `url`.

```
Celular → http://<ELASTIC_IP>/... → (Caddy) → https://portal.centernet.inf.br
```

## Subir

Pré-requisitos: EC2 com Elastic IP, porta 80/TCP liberada no Security Group, Docker + docker-compose.

```bash
sudo docker-compose up -d
```

## Testar

```bash
curl -I "http://<ELASTIC_IP>/guest/s/default/?mac=aa:bb:cc:dd:ee:ff&ap=test&ssid=test"
# Esperado: HTTP/1.1 200
```

## Configurar no UDM

- **External Portal Server** = `<ELASTIC_IP>`
- **Pre-Authorization Access** = `<ELASTIC_IP>`
- Habilitar a **Landing Page / Hotspot**

## Arquivos

- `docker-compose.yml` — sobe o Caddy; define `PORTAL_UPSTREAM` (domínio do portal).
- `Caddyfile` — proxy HTTP (porta 80) → HTTPS da Vercel, forçando o `Host` correto.

Guia completo: [`docs/CONFIGURACAO-UNIFI-CLOUD-GATEWAY.md`](../../docs/CONFIGURACAO-UNIFI-CLOUD-GATEWAY.md).
