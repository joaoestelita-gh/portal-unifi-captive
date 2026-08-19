/**
 * Buffer em memória com os últimos acessos ao portal (apenas para debug).
 *
 * LIMITAÇÃO CONHECIDA (best-effort): este armazenamento é POR PROCESSO. Com
 * `output: 'standalone'` + múltiplas réplicas (Docker/AWS) ou após um restart,
 * os logs NÃO são compartilhados nem persistidos — cada instância vê apenas os
 * acessos que ela mesma atendeu. É aceitável por ser uma ferramenta de
 * diagnóstico efêmera; para auditoria persistente, migrar para uma tabela
 * Postgres (ex.: `portal_access_logs`) e ler/gravar via Drizzle.
 *
 * (O adapter UniFi Cloud não usa cache de sessão em memória — autentica por
 * X-API-KEY a cada request. O adapter UniFi local mantém um `sessionCache`
 * por processo que se auto-recupera em respostas 401.)
 */

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
