import { NextResponse } from 'next/server'
import { getPortalLogs, clearOldPortalLogs } from '@/lib/portal-logs'

export async function GET() {
  const logs = await getPortalLogs()
  return NextResponse.json({ logs })
}

export async function DELETE() {
  // Clear logs older than 0 days (i.e. all logs)
  await clearOldPortalLogs(0)
  return NextResponse.json({ success: true })
}
