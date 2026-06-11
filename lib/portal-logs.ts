// Store last 20 portal access logs in memory (for debugging only)
// In production, you might want to store this in a database

export interface PortalLog {
  timestamp: string
  controller: string
  mac: string | null
  ip: string | null
  ssid: string | null
  apName: string | null
  params: Record<string, string>
}

const portalLogs: PortalLog[] = []

export const maxLogs = 20

export function addPortalLog(log: PortalLog) {
  portalLogs.unshift(log)
  if (portalLogs.length > maxLogs) {
    portalLogs.pop()
  }
}

export function getPortalLogs(): PortalLog[] {
  return portalLogs
}

export function clearPortalLogs() {
  portalLogs.length = 0
}
