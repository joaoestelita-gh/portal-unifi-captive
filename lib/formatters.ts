/**
 * Formatters — Funções utilitárias de formatação compartilhadas.
 *
 * Usadas tanto no admin-dashboard quanto em outros componentes/pages.
 */

/**
 * Formata uma duração em minutos para texto legível.
 *
 * @param minutes - Duração em minutos
 * @returns Texto formatado (ex: "2h 30min", "45min", "1 dia")
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '-'

  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  const days = Math.floor(minutes / 1440)
  const remaining = minutes % 1440
  const h = Math.floor(remaining / 60)

  if (h > 0) return `${days}d ${h}h`
  return `${days} dia${days > 1 ? 's' : ''}`
}

/**
 * Formata uptime em segundos para texto legível.
 *
 * @param seconds - Uptime em segundos
 * @returns Texto formatado (ex: "5d 3h 22min")
 */
export function formatUptime(seconds: number | null | undefined): string {
  if (!seconds) return '-'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}min`)

  return parts.join(' ') || '< 1min'
}

/**
 * Formata velocidade em Kbps para Mbps legível.
 *
 * @param kbps - Velocidade em Kbps
 * @returns Texto formatado (ex: "10 Mbps", "512 Kbps")
 */
export function formatSpeed(kbps: number | null | undefined): string {
  if (!kbps) return '-'
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(0)} Mbps`
  return `${kbps} Kbps`
}

/**
 * Formata bytes para representação legível.
 *
 * @param bytes - Quantidade de bytes
 * @returns Texto formatado (ex: "1.5 GB", "256 MB")
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

/**
 * Formata data relativa (ex: "há 5 min", "há 2h").
 *
 * @param date - Data para formatar
 * @returns Texto relativo
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `há ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `há ${diffDays}d`

  return target.toLocaleDateString('pt-BR')
}
