import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Aruba Instant On "Guest Portal" External Captive Portal in
// "Confirmação do Portal de Convidados" (Guest Portal Acknowledgement) mode
// does NOT use a /cgi-bin/login endpoint. Redirecting there returns
// "404 captive portal not find ecp config".
//
// Instead, the splash page must return the predefined token below in the
// response body. The AP inspects the response, detects the token and grants
// the client internet access.
// Ref: Aruba Instant On 2.8 user guide (p.97) and HPE Instant On community.
const ACK_TOKEN = 'Aruba.InstantOn.Acknowledge'

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function GET(req: NextRequest) {
  const redirectParam = req.nextUrl.searchParams.get('redirect') || ''
  const safeRedirect = /^https?:\/\//i.test(redirectParam)
    ? redirectParam
    : 'https://www.google.com'

  // The token is emitted first (and again inside the body) to maximize the
  // chance the AP detects it. A short delay before the final redirect gives
  // the AP time to process the acknowledgement before the user leaves.
  const body = `${ACK_TOKEN}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="3;url=${escapeAttr(safeRedirect)}" />
<title>Conectando...</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 48px 24px; color: #0f172a;">
<!-- ${ACK_TOKEN} -->
<p style="font-size: 18px; font-weight: 600;">Conectado!</p>
<p style="color: #64748b;">Redirecionando, aguarde...</p>
<script>
  setTimeout(function () { window.location.href = ${JSON.stringify(safeRedirect)}; }, 3000);
</script>
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
