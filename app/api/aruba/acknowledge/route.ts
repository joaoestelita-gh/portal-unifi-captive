import { type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// Aruba Instant On "Guest Portal" External Captive Portal in
// "Confirmação do Portal de Convidados" (Guest Portal Acknowledgement) mode
// does NOT use a /cgi-bin/login endpoint. Redirecting there returns
// "404 captive portal not find ecp config".
//
// To grant access, the AP inspects the HTTP response body of the splash page
// it serves and looks for this predefined token. Once it detects the token it
// authorizes the client MAC. This takes a few seconds — per the HPE Instant On
// community: "when the string is returned it is displayed in the browser and,
// after some time, the browser closes and internet access is allowed."
//
// Therefore the token MUST be present in the server-rendered HTML (so the AP
// sees it on page load), and we must NOT redirect before the AP has authorized
// the device — an early redirect is intercepted by the AP and produces the 404.
// Ref: Aruba Instant On 2.8 user guide (p.97) and HPE Instant On community.
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
// so the AP detects it immediately. We then wait for real connectivity before
// forwarding the user, which avoids the premature-redirect 404.
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
<!-- Token required by the Aruba Instant On AP to grant access. Must stay in the response body. -->
<div style="position:absolute;left:-9999px;top:-9999px;" aria-hidden="true">${ACK_TOKEN}</div>
<p style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Conectado!</p>
<p id="status" style="color: #64748b;">Liberando seu acesso, aguarde...</p>
<script>
  (function () {
    var destination = ${JSON.stringify(safeRedirect)};
    var redirected = false;
    function go() {
      if (redirected) return;
      redirected = true;
      window.location.href = destination;
    }

    // Tell the AP again via POST (harmless if not needed).
    try {
      fetch('/api/aruba/acknowledge', { method: 'POST', cache: 'no-store' }).catch(function () {});
    } catch (e) {}

    // Wait for REAL internet connectivity before redirecting. The AP needs a
    // few seconds to detect the token and authorize the device; redirecting
    // before that is intercepted and shows the 404 ecp error.
    var attempts = 0;
    function checkConnectivity() {
      attempts++;
      var img = new Image();
      var done = false;
      img.onload = function () { if (!done) { done = true; go(); } };
      img.onerror = function () {
        if (done) return;
        done = true;
        if (attempts < 12) {
          setTimeout(checkConnectivity, 1500);
        } else {
          // Give up waiting and try the redirect anyway as a last resort.
          go();
        }
      };
      // Cache-busted external resource. Loads only once the AP authorizes us.
      img.src = 'https://www.gstatic.com/generate_204?_=' + Date.now();
    }
    // Start checking shortly after load to give the AP time to read the token.
    setTimeout(checkConnectivity, 2000);
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
