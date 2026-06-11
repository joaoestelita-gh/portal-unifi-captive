import { NextResponse } from 'next/server'
import { getPortalLogs, clearPortalLogs } from '@/lib/portal-logs'

export async function GET() {
  return NextResponse.json({ logs: getPortalLogs() })
}

export async function DELETE() {
  clearPortalLogs()
  return NextResponse.json({ success: true })
}
