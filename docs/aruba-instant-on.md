# Configuração do Portal Captivo - Aruba Instant On

Guia completo para configurar o Portal Captivo Externo no Aruba Instant On
com autenticação via servidor RADIUS externo (FreeRADIUS).

---

## Visão Geral

O Aruba Instant On usa o método **Portal Captivo Externo (External Captive Portal)**
com autenticação via **servidor RADIUS externo (FreeRADIUS)**.
Quando um cliente conecta na rede Guest, o AP redireciona o navegador para a URL
do nosso portal, passando parâmetros na query string (MAC, SSID, nome do AP, etc.).

Após o login no portal, o cliente é enviado para o endpoint de login do AP
(`/cgi-bin/login`) com um token de uso único. O AP valida esse token contra o
servidor RADIUS configurado e só então libera o acesso.

> **Importante:** o modo **"Confirmação do Portal de Convidados"** (acknowledgement)
> **não é mais suportado** por este sistema, por ser instável em HTTPS. Use sempre
> **"Autenticação de Convidado (padrão)"** com RADIUS. O guia completo de instalação
> do servidor está em [`INSTALACAO-FREERADIUS.md`](./INSTALACAO-FREERADIUS.md).

---

## Pré-requisitos

| Requisito | Descrição |
|-----------|-----------|
| Servidor RADIUS | FreeRADIUS instalado e acessível na sua VPS (portas UDP 1812/1813) |
| HTTPS válido | O domínio do portal precisa de certificado SSL (a Vercel emite automaticamente) |
| Domínio configurado | Adicionar o domínio no projeto Vercel (Settings → Domains) |
| Rede Guest | Uma rede de visitantes criada no Instant On |
| DNS liberado | O AP precisa resolver o domínio do portal antes do login |

---

## Passo a Passo no Aruba Instant On

| # | Onde | O que fazer |
|---|------|-------------|
| 1 | App ou portal.arubainstanton.com | Acesse sua conta |
| 2 | Redes | Selecione sua rede Guest (visitantes) |
| 3 | Autenticação | Escolha "Autenticação de Convidado (padrão)" (NÃO use Confirmação) |
| 4 | Tipo de Portal | Defina "Externa" e cole a URL do portal |
| 5 | Servidor RADIUS | Informe o IP da VPS, portas 1812/1813 e o segredo compartilhado |
| 6 | Domínios Permitidos (Walled Garden) | Adicione o domínio do portal |
| 7 | Salvar | Confirme as configurações |

---

## URL do Servidor (campo principal)

Use a URL real do seu deploy. Tanto `/portal` quanto a raiz `/` funcionam,
pois as duas rotas foram unificadas.

```
https://SEU-DOMINIO/portal
```

Exemplo com domínio personalizado:

```
https://portal.centernet.inf.br/portal
```

---

## Servidor RADIUS (na tela do Aruba)

Ao escolher "Autenticação de Convidado (padrão)", a seção do servidor RADIUS
aparece na tela. Preencha:

| Campo | Valor |
|-------|-------|
| Servidor / Endereço IP | IP público da sua VPS (onde roda o FreeRADIUS) |
| Porta de autenticação | 1812 |
| Porta de accounting | 1813 |
| Segredo compartilhado | mesmo Shared Secret do `clients.conf` do FreeRADIUS |

> O AP precisa **alcançar a VPS** nas portas UDP 1812/1813. Garanta que o firewall
> da VPS libere essas portas (veja [`INSTALACAO-FREERADIUS.md`](./INSTALACAO-FREERADIUS.md)).

---

## Domínios Permitidos (Walled Garden)

Adicione estes domínios para que o portal carregue ANTES da autenticação:

```
portal.centernet.inf.br
fonts.googleapis.com
fonts.gstatic.com
```

> IMPORTANTE: Antes de autenticar, o cliente não tem internet. Para o portal
> carregar, o domínio do portal DEVE estar no Walled Garden, incluindo a
> liberação de DNS para resolver o domínio. Use a mesma grafia exata do domínio
> na URL do portal e aqui (`portal.centernet.inf.br`).

---

## Parâmetros enviados pela Aruba

Quando o AP redireciona, ele envia parâmetros na URL. O sistema lê os seguintes:

| Parâmetro | Descrição |
|-----------|-----------|
| cmd | Comando (login, logout) — identifica que é Aruba |
| mac | MAC address do cliente |
| ip | IP do cliente |
| essid | SSID da rede |
| apname | Nome do Access Point |
| apmac | MAC do Access Point |
| switchip | IP do switch/AP (host de login para o RADIUS) |
| vcname | Nome do Virtual Controller |
| url | URL original que o cliente tentava acessar |

Exemplo de redirecionamento recebido:

```
https://portal.centernet.inf.br/portal?cmd=login&mac=XX:XX:XX&essid=Guest&apname=AP01&switchip=X.X.X.X
```

---

## Checklist de Configuração

1. Instalar e configurar o FreeRADIUS na VPS (ver `INSTALACAO-FREERADIUS.md`)
2. Adicionar o domínio no projeto Vercel (Settings → Domains)
3. Aguardar o certificado SSL ficar ativo (cadeado verde)
4. Configurar a URL no Aruba: `https://SEU-DOMINIO/portal`
5. Preencher os dados do servidor RADIUS (IP da VPS, portas 1812/1813, segredo)
6. Adicionar o domínio no Walled Garden (incluindo DNS)
7. Definir o modo como "Autenticação de Convidado (padrão)"
8. Salvar e testar conectando um celular na rede Guest

---

## Como Validar

1. Conecte um dispositivo (celular) na rede Guest
2. O Aruba deve redirecionar automaticamente para o portal
3. Faça login/insira o voucher — o cliente é enviado ao `/cgi-bin/login` do AP
4. Acompanhe em tempo real no painel admin → "Logs de Acesso ao Portal"
5. Se o log aparecer com a tag verde "Aruba", a configuração está correta

---

## Solução de Problemas

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| "Site não encontrado" ao conectar | DNS bloqueado antes do login | Adicionar domínio + DNS no Walled Garden |
| Portal não abre / tela em branco | Domínio fora do Walled Garden | Adicionar o domínio do portal no Walled Garden |
| Erro de certificado | HTTPS não configurado | Confirmar SSL ativo no domínio da Vercel |
| Loga no portal mas não libera | AP não alcança o servidor RADIUS | Liberar UDP 1812/1813 e conferir IP/segredo do RADIUS |
| "Access-Reject" no RADIUS | Segredo compartilhado ou token incorreto | Conferir o Shared Secret no `clients.conf` e na tela do AP |
| "404 captive portal not find ecp config" após login | Rede Guest ainda no modo "Confirmação do Portal de Convidados" | Trocar para "Autenticação de Convidado (padrão)" com RADIUS |
| Log não aparece no admin | AP não está redirecionando | Confirmar tipo "Externa" e modo "Autenticação de Convidado" na rede Guest |

---

## Observações Importantes

- A autenticação acontece no **servidor RADIUS externo (FreeRADIUS)** instalado na
  sua VPS — não no acknowledgement da controladora.
- Use sempre HTTPS — o Instant On rejeita portais sem certificado válido.
- As rotas `/` e `/portal` são equivalentes no sistema.
- O domínio na URL do portal e em "Domínios permitidos" deve ter a grafia idêntica.
