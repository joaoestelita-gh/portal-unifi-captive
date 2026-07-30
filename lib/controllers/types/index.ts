/**
 * Domain Types — Controladores WiFi
 *
 * Tipos compartilhados por todos os adapters.
 * Nenhum adapter deve expor tipos específicos de fabricante fora desta camada.
 */

// --- Controller identification ---

export type ControllerType = 'unifi' | 'aruba' | 'mikrotik' | 'omada'

export interface ControllerConfig {
  /** Tipo do controlador */
  type: ControllerType
  /** URL base do controlador (ex: https://192.168.1.1) */
  baseUrl: string
  /** Credenciais de acesso */
  credentials: ControllerCredentials
  /** Configurações específicas do fabricante (opcionais) */
  options?: Record<string, unknown>
}

export interface ControllerCredentials {
  username?: string
  password?: string
  clientId?: string
  clientSecret?: string
  apiKey?: string
  site?: string
}

// --- Authorization ---

export interface AuthorizeGuestParams {
  /** MAC address do dispositivo (format: aa:bb:cc:dd:ee:ff) */
  macAddress: string
  /** Duração da sessão em minutos */
  sessionMinutes: number
  /** Limite de upload em Kbps (opcional) */
  speedLimitUp?: number
  /** Limite de download em Kbps (opcional) */
  speedLimitDown?: number
  /** IP do cliente (opcional, usado por alguns controllers) */
  clientIp?: string
  /** Parâmetros extras específicos do fabricante */
  extra?: Record<string, unknown>
}

export interface AuthorizeGuestResult {
  /** Se a autorização foi bem-sucedida */
  success: boolean
  /** URL de redirecionamento (usado pelo Aruba para redirect ao AP) */
  redirectUrl?: string
  /** Mensagem de erro (se success=false) */
  error?: string
}

export interface DeauthorizeGuestParams {
  /** MAC address do dispositivo */
  macAddress: string
}

export interface DeauthorizeGuestResult {
  success: boolean
  error?: string
}

// --- Client info ---

export interface WifiClient {
  /** MAC address */
  mac: string
  /** IP address (se disponível) */
  ip?: string
  /** Hostname do dispositivo */
  hostname?: string
  /** Nome amigável */
  name?: string
  /** Se está autorizado */
  authorized: boolean
  /** Se é guest (visitante) */
  isGuest: boolean
  /** Uptime em segundos */
  uptime?: number
  /** Bytes enviados */
  txBytes?: number
  /** Bytes recebidos */
  rxBytes?: number
}

// --- Connection test ---

export interface ConnectionTestResult {
  /** Se a conexão foi estabelecida */
  success: boolean
  /** Mensagem descritiva */
  message: string
  /** Informações extras (versão do controller, nome do site, etc.) */
  details?: Record<string, unknown>
}

// --- Site/Location info ---

export interface ControllerSite {
  /** ID do site no controller */
  id: string
  /** Nome amigável */
  name: string
  /** Descrição */
  description?: string
}

// --- Device (AP/Switch/Gateway) ---

export interface NetworkDevice {
  /** Nome do dispositivo */
  name: string
  /** Modelo */
  model: string
  /** Tipo: ap, switch, gateway */
  type: 'ap' | 'switch' | 'gateway' | 'other'
  /** MAC address */
  mac: string
  /** IP address */
  ip: string
  /** Versão do firmware */
  version?: string
  /** Estado: online/offline */
  state: 'online' | 'offline'
  /** Número de clientes conectados */
  clientCount?: number
  /** Número de guests conectados */
  guestCount?: number
}

// --- Errors ---

export class ControllerConnectionError extends Error {
  constructor(
    public controllerType: ControllerType,
    message: string,
    public originalError?: unknown
  ) {
    super(`[${controllerType}] ${message}`)
    this.name = 'ControllerConnectionError'
  }
}

export class ControllerAuthorizationError extends Error {
  constructor(
    public controllerType: ControllerType,
    public macAddress: string,
    message: string,
    public originalError?: unknown
  ) {
    super(`[${controllerType}] Failed to authorize ${macAddress}: ${message}`)
    this.name = 'ControllerAuthorizationError'
  }
}

export class ControllerNotConfiguredError extends Error {
  constructor(public controllerType: ControllerType) {
    super(`[${controllerType}] Controller not configured`)
    this.name = 'ControllerNotConfiguredError'
  }
}
