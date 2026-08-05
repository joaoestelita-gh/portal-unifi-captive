/**
 * Tipos compartilhados do Portal — usados por actions e components.
 *
 * Centraliza interfaces que antes eram definidas localmente
 * em múltiplos arquivos (captive-portal-form, admin-dashboard, actions).
 */

import type { ArubaRedirectParams, ArubaAuthCredentials } from '@/lib/controllers/adapters/aruba.adapter'

export type { ArubaRedirectParams, ArubaAuthCredentials }

/**
 * Metadados da sessão WiFi capturados durante login.
 */
export interface SessionMeta {
  apName?: string
  ssid?: string
  site?: string
  lgpdAccepted?: boolean
}

/**
 * Resultado padrão de operações do portal.
 */
export interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Resultado do login WiFi (user ou voucher).
 */
export interface LoginResult extends ActionResult {
  sessionId?: string
  sessionMinutes?: number
  userName?: string
  redirectUrl?: string
}

/**
 * Resultado da verificação de sessão ativa.
 */
export interface ActiveSessionResult {
  hasActiveSession: boolean
  userName?: string
  remainingMinutes?: number
  redirectUrl?: string
}

/**
 * Portal settings inferido do schema do banco.
 * Re-exportado aqui para uso em components sem importar o schema diretamente.
 */
export interface PortalSettings {
  id: string
  portalTitle: string | null
  portalSubtitle: string | null
  logoUrl: string | null
  backgroundUrl: string | null
  backgroundColor: string | null
  primaryColor: string | null
  secondaryColor: string | null
  colorScheme: string | null
  termsText: string | null
  defaultSessionMinutes: number | null
  defaultDailyMinutes: number | null
  defaultSpeedDown: number | null
  defaultSpeedUp: number | null
  requireApproval: boolean | null
  controllerType: string | null
  unifiEnabled: boolean | null
  arubaEnabled: boolean | null
  unifiControllerUrl: string | null
  unifiUsername: string | null
  unifiPassword: string | null
  unifiSite: string | null
  arubaControllerUrl: string | null
  arubaClientId: string | null
  arubaClientSecret: string | null
  successRedirectUrl: string | null
  updatedAt: Date | null
}
