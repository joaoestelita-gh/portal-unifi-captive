import { type NextRequest, NextResponse } from 'next/server'

// Aruba Instant On "Confirmação do Portal de Convidados" (Guest Portal
// Acknowledgement) mode.
//
// In this mode there is NO /cgi-bin/login endpoint. The splash page must simply
// return the predefined token "Aruba.InstantOn.Acknowledge" in its response
// body. The AP detects the token, grants internet access, and the captive
// browser closes on its own after a few seconds.
// (Ref: Aruba Instant On user guide — Guest Portal acknowledgement.)

const ACK_TOKEN = 'Aruba.InstantOn.Acknowledge'

// Test variant: return the token wrapped in a minimal HTML document.
const ACK_HTML = `<html>
<body>
${ACK_TOKEN}
</body>
</html>`

export async function GET(_req: NextRequest) {
  // TEST: wrap the token in a minimal HTML body. Some AP firmware looks for the
  // token inside the rendered page body rather than as a bare text response.
  return new NextResponse(ACK_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// Some AP firmware probes the acknowledgement via POST. Return the same HTML.
export async function POST() {
  return new NextResponse(ACK_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
