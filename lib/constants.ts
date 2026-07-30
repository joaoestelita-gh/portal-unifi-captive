/**
 * Constantes da aplicação — valores padrão centralizados.
 *
 * Qualquer valor "mágico" espalhado pelo código deve ser definido aqui.
 * Facilita manutenção e garante consistência entre módulos.
 */

// --- WiFi Session Defaults ---

/** Velocidade padrão de upload em Kbps */
export const DEFAULT_SPEED_UP_KBPS = 5120

/** Velocidade padrão de download em Kbps */
export const DEFAULT_SPEED_DOWN_KBPS = 10240

/** Limite diário padrão em minutos */
export const DEFAULT_DAILY_MINUTES = 240

/** Duração padrão de sessão em minutos */
export const DEFAULT_SESSION_MINUTES = 120

/** Número máximo de dispositivos por usuário */
export const MAX_DEVICES_PER_USER = 3

// --- Trust Duration ---

/** Mapeamento de duração de confiança para milissegundos */
export const TRUST_DURATIONS: Record<string, number | null> = {
  '7days': 7 * 24 * 60 * 60 * 1000,
  '30days': 30 * 24 * 60 * 60 * 1000,
  '90days': 90 * 24 * 60 * 60 * 1000,
  permanent: null,
}

/**
 * Calcula a data de expiração de confiança para o período informado.
 *
 * @param duration - Período de confiança ('7days', '30days', '90days', 'permanent')
 * @returns Data de expiração ou null para permanente
 */
export function calculateTrustExpiry(duration: string): Date | null {
  const ms = TRUST_DURATIONS[duration]
  if (ms === null || ms === undefined) return null
  return new Date(Date.now() + ms)
}

// --- Portal Defaults ---

export const DEFAULT_PORTAL_SETTINGS = {
  portalTitle: 'WiFi Gratuito',
  portalSubtitle: 'Conecte-se à nossa rede',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  defaultSessionMinutes: DEFAULT_SESSION_MINUTES,
  defaultDailyMinutes: DEFAULT_DAILY_MINUTES,
  defaultSpeedDown: DEFAULT_SPEED_DOWN_KBPS,
  defaultSpeedUp: DEFAULT_SPEED_UP_KBPS,
  requireApproval: true,
  controllerType: 'none',
} as const

// --- Redirect Defaults ---

/** URL de fallback quando nenhuma URL de sucesso está configurada */
export const DEFAULT_SUCCESS_REDIRECT_URL = 'https://google.com'
