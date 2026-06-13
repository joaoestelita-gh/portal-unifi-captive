# Configuração do Portal Captivo - Aruba Instant On

Guia completo para configurar o Portal Captivo Externo no Aruba Instant On
e integrar com o sistema.

---

## Visão Geral

O Aruba Instant On usa o método **Portal Captivo Externo (External Captive Portal)**.
Quando um cliente conecta na rede Guest, o AP redireciona o navegador para a URL
do nosso portal, passando parâmetros na query string (MAC, SSID, nome do AP, etc.).

Não há API de autorização ativa no Instant On — a liberação acontece via redirect.
O cliente é desconectado automaticamente quando a sessão expira no próprio AP.

---

## Pré-requisitos

| Requisito | Descrição |
|-----------|-----------|
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
| 3 | Segurança → Tipo de Portal | Escolha "Portal Captivo Externo" |
| 4 | URL do Servidor | Cole a URL do portal (ver abaixo) |
| 5 | Domínios Permitidos (Walled Garden) | Adicione os domínios necessários |
| 6 | Salvar | Confirme as configurações |

---

## URL do Servidor (campo principal)

Use a URL real do seu deploy. Tanto `/portal` quanto a raiz `/` funcionam,
pois as duas rotas foram unificadas.

```
https://SEU-DOMINIO/portal
```

Exemplo com domínio personalizado:

```
https://portal.centerent.inf.br/portal
```

---

## Domínios Permitidos (Walled Garden)

Adicione estes domínios para que o portal carregue ANTES da autenticação:

```
portal.centerent.inf.br
fonts.googleapis.com
fonts.gstatic.com
```

> IMPORTANTE: Antes de autenticar, o cliente não tem internet. Para o portal
> carregar, o domínio do portal DEVE estar no Walled Garden, incluindo a
> liberação de DNS para resolver o domínio.

---

## Configuração de Autenticação

| Campo | Valor |
|-------|-------|
| Tipo de autenticação | Externa (External Captive Portal) |
| Método | Redirect (sem RADIUS) |
| Redirecionar após login | Sim (URL original do cliente) |

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
| switchip | IP do switch/AP |
| vcname | Nome do Virtual Controller |
| url | URL original que o cliente tentava acessar |

Exemplo de redirecionamento recebido:

```
https://portal.centerent.inf.br/portal?cmd=login&mac=XX:XX:XX&essid=Guest&apname=AP01&switchip=X.X.X.X
```

---

## Checklist de Configuração

1. Adicionar o domínio no projeto Vercel (Settings → Domains)
2. Aguardar o certificado SSL ficar ativo (cadeado verde)
3. Configurar a URL no Aruba: `https://SEU-DOMINIO/portal`
4. Adicionar os domínios no Walled Garden (incluindo DNS)
5. Definir tipo de portal como "Portal Captivo Externo"
6. Salvar e testar conectando um celular na rede Guest

---

## Como Validar

1. Conecte um dispositivo (celular) na rede Guest
2. O Aruba deve redirecionar automaticamente para o portal
3. Acompanhe em tempo real no painel admin → "Logs de Acesso ao Portal"
4. Se o log aparecer com a tag verde "Aruba", a configuração está correta

---

## Solução de Problemas

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| "Site não encontrado" ao conectar | DNS bloqueado antes do login | Adicionar domínio + DNS no Walled Garden |
| Portal não abre / tela em branco | Domínio fora do Walled Garden | Adicionar o domínio do portal no Walled Garden |
| Erro de certificado | HTTPS não configurado | Confirmar SSL ativo no domínio da Vercel |
| Redireciona mas não loga | URL do servidor incorreta | Conferir a URL no campo "URL do Servidor" |
| "404 captive portal not find ecp config" após login | O redirect de volta enviava campos que o AP não reconhece (`mac`, `duration`, `essid`, `ip`...), impedindo o AP de casar o perfil ECP | Corrigido: o redirect agora envia APENAS os campos que o endpoint `/cgi-bin/login` do Aruba entende (`cmd=authenticate`, `user`, `password`, `url`), usando o host enviado em `switchip`. Verifique também: (1) o `switchip` precisa estar habilitado na rede Guest; (2) o domínio do portal deve estar no Walled Garden |
| Log não aparece no admin | AP não está redirecionando | Confirmar tipo "Portal Captivo Externo" na rede Guest |

---

## Observações Importantes

- O Aruba Instant On NÃO possui API para desautorização ativa. O cliente é
  desconectado apenas quando a sessão expira no AP.
- A liberação de acesso é feita 100% via redirect.
- Use sempre HTTPS — o Instant On rejeita portais sem certificado válido.
- As rotas `/` e `/portal` são equivalentes no sistema.
