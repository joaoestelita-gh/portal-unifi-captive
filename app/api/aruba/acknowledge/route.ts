import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Aruba Instant On "Guest Portal" External Captive Portal in
// "Confirmação do Portal de Convidados" (Guest Portal Acknowledgement) mode
// does NOT use a /cgi-bin/login endpoint. Redirecting there returns
// "404 captive portal not find ecp config".
//
// To grant access, the AP watches for an HTTP response whose body is the
// predefined token below. Per the HPE Instant On community, the AP expects
// this token as the response to a POST, and the body must contain ONLY the
// token (no extra HTML). Once the AP sees it, the client is granted internet
// access.
// Ref: Aruba Instant On 2.8 user guide (p.97) and HPE Instant On community.
const ACK_TOKEN = 'Aruba.InstantOn.Acknowledge'

// POST: the AP-facing acknowledgement. Body is ONLY the token, as text/plain,
// so the access point reliably detects it and opens the gate.
export async function POST() {
  return new Response(ACK_TOKEN, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// GET: the user-facing page. It triggers the acknowledgement POST (which the
// AP detects to grant access) and only then forwards the user to the final
// destination. The visible page stays clean (no raw token text).
export async function GET(req: NextRequest) {
  const redirectParam = req.nextUrl.searchParams.get('redirect') || ''
  const safeRedirect = /^https?:\/\//i.test(redirectParam)
    ? redirectParam
    : 'https://www.google.com'

  const body = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Conectando...</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 48px 24px; color: #0f172a;">
<p style="font-size: 18px; font-weight: 600;">Conectado!</p>
<p style="color: #64748b;">Redirecionando, aguarde...</p>
<script>
  (function () {
    var destination = ${JSON.stringify(safeRedirect)};
    function go() { window.location.href = destination; }
    // Send the acknowledgement POST so the AP grants internet access, then
    // forward the user. Redirect happens regardless so the user is never stuck.
    try {
      fetch('/api/aruba/acknowledge', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Accept': 'text/plain' },
      }).then(function () {
        setTimeout(go, 1500);
      }).catch(function () {
        setTimeout(go, 2500);
      });
    } catch (e) {
      setTimeout(go, 2500);
    }
  })();
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
