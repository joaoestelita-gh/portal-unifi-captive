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

export async function GET(_req: NextRequest) {
  // CRITICAL: In the Aruba "Authentication Text" acknowledgement flow, the AP
  // inspects the response body and only grants access when it contains the
  // token and NOTHING that turns the page into a normal document to render.
  // If the token shows up as visible text on the captive browser (as seen in
  // testing), it means the AP did NOT consume it — usually because the body
  // had surrounding HTML. So we return the bare token only, as plain text.
  return new NextResponse(ACK_TOKEN, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

// Some AP firmware probes the acknowledgement via POST. Return the bare token.
export async function POST() {
  return new NextResponse(ACK_TOKEN, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
