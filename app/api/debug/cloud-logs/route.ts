import { NextResponse } from 'next/server'
import { getCloudApiLogs, clearCloudApiLogs } from '@/lib/cloud-api-logs'

// Protegido por sessão admin: /api/debug é rota admin em proxy.ts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const onlyErrors = searchParams.get('onlyErrors') === '1'
  const logs = await getCloudApiLogs({ limit: 100, onlyErrors })
  return NextResponse.json({ logs })
}

export async function DELETE() {
  await clearCloudApiLogs()
  return NextResponse.json({ success: true })
}
