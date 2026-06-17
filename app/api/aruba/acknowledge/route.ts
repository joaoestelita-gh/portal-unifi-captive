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
  // The token is the VERY FIRST content of the response body so that AP
  // firmware that only scans the first bytes still detects it.
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

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
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
