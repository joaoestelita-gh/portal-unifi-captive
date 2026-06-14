import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Aruba Instant On "Guest Portal" External Captive Portal in
// "Confirmação do Portal de Convidados" (Guest Portal Acknowledgement) mode
// does NOT use a /cgi-bin/login endpoint. Redirecting there — or to any
// external URL before the AP has authorized the device — returns
// "404 captive portal not find ecp config".
//
// Per the HPE Instant On documentation/community, to grant access the splash
// page simply has to RETURN this predefined token in its HTTP response body.
// The AP inspects the body, detects the token, authorizes the client MAC and
// then the captive mini-browser (iOS CNA / Android) CLOSES BY ITSELF and the
// internet is released.
//
// KEY POINT: we must NOT try to redirect. An explicit redirect is routed back
// through the captive portal (which has not finished releasing the client) and
// is what produces the 404. The correct behavior is to show the token and let
// the OS close the captive browser automatically.
// Ref: Aruba Instant On user guide (p.97) and HPE Instant On community.
const ACK_TOKEN = 'Aruba.InstantOn.Acknowledge'

// POST fallback: some setups acknowledge via POST. Body is ONLY the token.
export async function POST() {
  return new Response(ACK_TOKEN, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// GET: the user-facing splash page. The token is embedded directly in the HTML
// (visible in the body) so the AP detects it immediately and grants access.
// No redirect and no connectivity polling — the captive browser closes itself.
export async function GET(_req: NextRequest) {
  // The token is the VERY FIRST content of the response body so that AP
  // firmware that only scans the first bytes still detects it. Everything
  // after it is just the friendly message shown to the user.
  const body = `${ACK_TOKEN}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Conectado</title>
</head>
<body style="margin:0;font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 56px 24px; color: #0f172a; background:#f8fafc;">
<div style="max-width:420px;margin:32px auto 0;">
  <div style="font-size: 48px; line-height:1; margin-bottom: 16px;">&#10003;</div>
  <p style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Conectado!</p>
  <p style="color: #64748b; margin: 0;">Seu acesso a internet foi liberado. Aguarde alguns segundos: esta janela fecha sozinha e voce ja pode navegar normalmente.</p>
</div>
</body>
</html>`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
