# Configuração — Cloud Gateway UniFi + Portal CenterNet

## Passo a Passo Completo

---

## Passo 1: Criar usuário dedicado para o Portal

**Settings → Admins → Create New Admin**

| Campo | Valor |
|-------|-------|
| Name | `centernet-api` |
| Email | `centernet@seudominio.com` |
| Password | Senha forte (guarde — vai usar no portal) |
| Role | **Super Admin** |

---

## Passo 2: Criar a Rede WiFi Guest

**Settings → WiFi → Create New WiFi Network**

| Campo | Valor |
|-------|-------|
| Name | `CenterNet-Guest` (ou o nome que quiser) |
| Password | Deixar em branco (Open) |
| Network | Selecionar **Guest** |
| WiFi Band | 2.4 GHz + 5 GHz |

---

## Passo 3: Ativar Guest Hotspot

**Settings → WiFi → CenterNet-Guest → Security**

| Campo | Valor |
|-------|-------|
| Guest Hotspot | ✅ **Ativado** |

---

## Passo 4: Configurar Portal Externo

**Settings → WiFi → CenterNet-Guest → Security → Hotspot**

| Campo | Valor |
|-------|-------|
| Authentication | **External Portal Server** |
| Portal Type | **External** |
| Custom Portal URL | `https://portal.centernet.inf.br/portal` |
| Redirect HTTPS | ✅ Ativado |

---

## Passo 5: Configurar Pre-Authorization Access (domínios liberados)

**Settings → WiFi → CenterNet-Guest → Security → Hotspot → Pre-Authorization Access**

Adicionar:

| Tipo | Valor |
|------|-------|
| FQDN (hostname) | `portal.centernet.inf.br` |

Isso permite que o visitante acesse o portal **antes** de ser autorizado.

---

## Passo 6: Firewall — Liberar DNS para guests

**Settings → Firewall & Security → Firewall Rules → Create New Rule**

| Campo | Valor |
|-------|-------|
| Name | `Allow DNS Guest` |
| Type | LAN → Internet |
| Action | **Allow** |
| Source | Guest Network |
| Destination | Any |
| Port | 53 (TCP + UDP) |

> **Nota:** Em muitos Cloud Gateways o DNS já está liberado por padrão para guests. Se o portal carregar sem essa regra, não precisa criar.

---

## Passo 7: Garantir acesso externo à API (porta 443)

No **firewall do provedor/roteador** (não no UniFi):

| Campo | Valor |
|-------|-------|
| Porta | 443 |
| Protocolo | TCP |
| Permitir de | IP do servidor onde roda o Portal CenterNet |
| Destino | IP público do Cloud Gateway |

> **Segurança:** Libere a porta 443 **apenas** para o IP do seu servidor (Oracle/VPS). Não abra para qualquer IP.

---

## Passo 8: Configurar no Portal CenterNet

Acesse `https://portal.centernet.inf.br/admin` → **Controladora**

| Campo | Valor |
|-------|-------|
| Tipo | **UniFi** |
| URL do Controller | `https://IP-PUBLICO-DO-CLOUD-GATEWAY` |
| Usuário | `centernet-api` |
| Senha | A senha que criou no Passo 1 |
| Site | `default` (ou clique "Buscar Sites") |

Clique em **Testar Conexão** → deve retornar verde com modelo, versão e APs.

---

## Passo 9: Testar o fluxo completo

1. Conecte um celular na rede **CenterNet-Guest**
2. O Cloud Gateway deve redirecionar para o portal
3. Faça login ou use um voucher
4. O acesso é liberado automaticamente

---

## Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Usuário `centernet-api` criado (Super Admin) | ☐ |
| 2 | Rede WiFi Guest criada (Open) | ☐ |
| 3 | Guest Hotspot ativado | ☐ |
| 4 | External Portal URL configurada | ☐ |
| 5 | Domínio do portal em Pre-Authorization Access | ☐ |
| 6 | DNS liberado para guests | ☐ |
| 7 | Porta 443 do gateway acessível pelo portal | ☐ |
| 8 | CenterNet configurado com URL + credenciais | ☐ |
| 9 | Testar Conexão → verde ✅ | ☐ |
| 10 | Teste real com celular → login → acesso | ☐ |

---

## Diagrama do Fluxo

```
Visitante conecta WiFi "CenterNet-Guest"
       ↓
Cloud Gateway detecta (não autorizado)
       ↓
Gateway redireciona → https://portal.centernet.inf.br/portal?mac=XX&ap=XX
       ↓
Visitante faz login no portal
       ↓
Portal chama API → https://IP-PUBLICO:443/proxy/network/api/s/default/cmd/stamgr
       ↓
Cloud Gateway autoriza o MAC instantaneamente
       ↓
Visitante navega normalmente
```

---

## Solução de Problemas

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Portal não carrega no celular | Domínio não liberado em Pre-Auth | Adicionar FQDN no Passo 5 |
| "Testar Conexão" falha com timeout | Porta 443 bloqueada | Verificar firewall do provedor (Passo 7) |
| "Credenciais inválidas" | Usuário/senha errados | Verificar no Passo 1 |
| Login funciona mas não libera internet | authorizeGuest falhou | Verificar se usuário é Super Admin |
| Redirecionamento não acontece | Hotspot não ativado | Verificar Passo 3 |

---

*CenterNet — Portal Captivo WiFi*
*Documento gerado em: Agosto/2026*
