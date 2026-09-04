import { NextResponse } from 'next/server'

/**
 * Health check de conectividade para o captive portal.
 *
 * Responde HTTP 204 (sem corpo) quando o app está acessível. A tela de sucesso
 * usa este endpoint para confirmar que o dispositivo tem saída real de rede
 * (fora da interceptação do captive portal): como a resposta é servida pelo
 * próprio app com CORS liberado, o cliente consegue ler `res.status === 204`
 * de verdade — eliminando o falso positivo do fetch `no-cors` contra domínios
 * públicos.
 *
 * Nunca deve ser cacheado.
 */

// Sempre executar em runtime (nunca pré-renderizar/cachear no build).
export const dynamic = 'force-dynamic'
export const revalidate = 0

const HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
}

export function GET() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function HEAD() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}
