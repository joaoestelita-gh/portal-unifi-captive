/**
 * UniFi Adapter — Implementação completa do WifiControllerAdapter para UniFi OS
 *
 * Compatível com: Cloud Key Gen2+, UDM, UDM Pro, UDR, UCG
 *
 * Toda comunicação ocorre via HTTPS.
 * A aplicação NUNCA importa este arquivo diretamente.
 * O acesso é sempre via ControllerFactory → WifiControllerAdapter.
 *
 * Autenticação:
 * - Cookie-based (padrão): POST /api/auth/login → cookie de sessão
 * - Token-based (futuro): via API key no header (preparado, não implementado)
 *
 * Princípios:
 * - SRP: responsável apenas pela tradução UniFi ↔ domínio
 * - OCP: fechado para modificação, aberto para extensão
 * - LSP: substituível por qualquer outro adapter
 */

import type { WifiControllerAdapter, ControllerCapability } from '../wifi-controller.adapter'
import type {
  ControllerConfig,
  AuthorizeGuestParams,
  AuthorizeGuestResult,
  DeauthorizeGuestParams,
  DeauthorizeGuestResult,
  WifiClient,
  ConnectionTestResult,
  ControllerSite,
  NetworkDevice,
} from '../types'
import {
  ControllerConnectionError,
  ControllerAuthorizationError,
  ControllerNotConfiguredError,
} from '../types'

// --- UniFi-specific types (internal, never exported) ---

interface UnifiAuthSession {
  cookie: string
  expiresAt: number // timestamp
}

interface UnifiApiResponse<T = unknown> {
  meta: { rc: string; msg?: string }
  data: T
}

interface UnifiRawSite {
  _id: string
  name: string
  desc: string
  role?: string
}

interface UnifiRawDevice {
  _id: string
  mac: string
  model: string
  type: string // ugw, uap, usw, udm
  name?: string
  ip: string
  version: string
  state: number // 1 = online
  num_sta?: number
  guest_num_sta?: number
  displayable_version?: string
}

interface UnifiRawClient {
  mac: string
  ip?: string
  hostname?: string
  name?: string
  authorized: boolean
  is_guest: boolean
  first_seen?: number
  last_seen?: number
  uptime?: number
  tx_bytes?: number
  rx_bytes?: number
}

interface UnifiRawVoucher {
  _id: string
  code: string
  create_time: number
  duration: number // minutes
  quota: number // max uses (0 = unlimited)
  used: number
  note?: string
  status: string // 'VALID_ONE' | 'VALID_MULTI'
  status_expires?: number
}

interface UnifiControllerInfo {
  version?: string
  name?: string
  hostname?: string
}

// --- Voucher types (extension beyond base interface) ---

export interface CreateVoucherParams {
  /** Quantidade de vouchers a gerar */
  count: number
  /** Duração em minutos */
  durationMinutes: number
  /** Número máximo de usos por voucher (1 = single-use) */
  maxUses?: number
  /** Limite de upload Kbps (0 = ilimitado) */
  speedLimitUp?: number
  /** Limite de download Kbps (0 = ilimitado) */
  speedLimitDown?: number
  /** Nota/descrição */
  note?: string
}

export interface UnifiVoucher {
  id: string
  code: string
  durationMinutes: number
  maxUses: number
  usedCount: number
  note?: string
  createdAt: Date
}

// ============================================================================
// UNIFI ADAPTER
// ============================================================================

export class UnifiAdapter implements WifiControllerAdapter {
  readonly type = 'unifi' as const

  // Cache de sessão por baseUrl (evita re-login a cada operação)
  private static sessionCache = new Map<string, UnifiAuthSession>()

  // --- Capabilities ---

  private static readonly SUPPORTED_CAPABILITIES: ControllerCapability[] = [
    'authorize',
    'deauthorize',
    'kick',
    'list-clients',
    'list-sites',
    'list-devices',
    'bandwidth-limit',
  ]

  supports(capability: ControllerCapability): boolean {
    return UnifiAdapter.SUPPORTED_CAPABILITIES.includes(capability)
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Autentica no controller UniFi e obtém cookie de sessão.
   * Usa cache para evitar re-login desnecessário (sessão válida por 30min).
   *
   * Preparado para suportar Token Auth no futuro:
   * - Se config.credentials.apiKey existir, usar header X-API-KEY
   * - Caso contrário, usar login cookie-based (padrão)
   */
  private async authenticate(config: ControllerConfig): Promise<string> {
    // Futuro: Token-based auth
    if (config.credentials.apiKey) {
      // Quando UniFi suportar API keys nativamente:
      // return `Bearer ${config.credentials.apiKey}`
      // Por ora, fallback para cookie-based
    }

    // Verificar cache de sessão
    const cached = UnifiAdapter.sessionCache.get(config.baseUrl)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.cookie
    }

    // Login cookie-based
    const loginUrl = `${config.baseUrl}/api/auth/login`

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.credentials.username,
        password: config.credentials.password,
      }),
      // @ts-expect-error - Node.js specific: aceitar self-signed certs
      rejectUnauthorized: false,
    })

    if (!response.ok) {
      throw new ControllerConnectionError(
        'unifi',
        `Login failed: HTTP ${response.status}`,
        { status: response.status }
      )
    }

    const setCookie = response.headers.get('set-cookie')
    if (!setCookie) {
      throw new ControllerConnectionError(
        'unifi',
        'Login succeeded but no session cookie received'
      )
    }

    const cookie = setCookie.split(';')[0]

    // Cache por 25 minutos (sessão UniFi dura ~30min)
    UnifiAdapter.sessionCache.set(config.baseUrl, {
      cookie,
      expiresAt: Date.now() + 25 * 60 * 1000,
    })

    return cookie
  }

  /**
   * Executa uma requisição autenticada à API UniFi.
   * Se receber 401, tenta re-autenticar uma vez.
   */
  private async request<T>(
    config: ControllerConfig,
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const site = config.credentials.site || 'default'
    const url = `${config.baseUrl}/proxy/network/api/s/${site}${endpoint}`

    const makeRequest = async (cookie: string): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          ...(options?.headers || {}),
        },
        // @ts-expect-error - Node.js specific
        rejectUnauthorized: false,
      })
    }

    let cookie = await this.authenticate(config)
    let response = await makeRequest(cookie)

    // Retry on 401 (session expired)
    if (response.status === 401) {
      UnifiAdapter.sessionCache.delete(config.baseUrl)
      cookie = await this.authenticate(config)
      response = await makeRequest(cookie)
    }

    if (!response.ok) {
      throw new ControllerConnectionError(
        'unifi',
        `API request failed: ${response.status} ${endpoint}`,
        { status: response.status, endpoint }
      )
    }

    const json = await response.json() as UnifiApiResponse<T>
    return json.data
  }

  /**
   * Requisição ao endpoint global (não site-specific).
   */
  private async requestGlobal<T>(
    config: ControllerConfig,
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${config.baseUrl}${endpoint}`

    const cookie = await this.authenticate(config)

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        ...(options?.headers || {}),
      },
      // @ts-expect-error - Node.js specific
      rejectUnauthorized: false,
    })

    if (!response.ok) {
      throw new ControllerConnectionError(
        'unifi',
        `API request failed: ${response.status} ${endpoint}`,
        { status: response.status, endpoint }
      )
    }

    const json = await response.json() as UnifiApiResponse<T>
    return json.data
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private validateConfig(config: ControllerConfig): void {
    if (!config.baseUrl) {
      throw new ControllerNotConfiguredError('unifi')
    }
    if (!config.credentials.username || !config.credentials.password) {
      // Futuro: aceitar apiKey como alternativa
      if (!config.credentials.apiKey) {
        throw new ControllerNotConfiguredError('unifi')
      }
    }
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  /**
   * Testa conexão: login + lista sites para confirmar acesso.
   */
  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    try {
      const sites = await this.requestGlobal<UnifiRawSite[]>(
        config,
        '/proxy/network/api/self/sites'
      )

      const currentSite = sites.find(s => s.name === (config.credentials.site || 'default'))

      return {
        success: true,
        message: `Conexão estabelecida com sucesso!`,
        details: {
          siteName: currentSite?.desc || currentSite?.name || 'default',
          totalSites: sites.length,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Falha ao conectar',
        details: { error: String(error) },
      }
    }
  }

  /**
   * Autoriza um guest na rede WiFi via comando stamgr.
   */
  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    try {
      await this.request(config, '/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'authorize-guest',
          mac: params.macAddress.toLowerCase(),
          minutes: params.sessionMinutes,
          up: params.speedLimitUp || undefined,
          down: params.speedLimitDown || undefined,
        }),
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao autorizar'
      console.error(`[UniFi] Authorization failed for ${params.macAddress}:`, error)
      return { success: false, error: message }
    }
  }

  /**
   * Revoga autorização de um guest.
   */
  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    try {
      await this.request(config, '/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'unauthorize-guest',
          mac: params.macAddress.toLowerCase(),
        }),
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao desautorizar'
      console.error(`[UniFi] Deauthorization failed for ${params.macAddress}:`, error)
      return { success: false, error: message }
    }
  }

  /**
   * Força desconexão imediata de um cliente.
   */
  async kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    this.validateConfig(config)

    try {
      await this.request(config, '/cmd/stamgr', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'kick-sta',
          mac: macAddress.toLowerCase(),
        }),
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao desconectar',
      }
    }
  }

  /**
   * Lista clientes conectados (todos ou apenas guests).
   */
  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    this.validateConfig(config)

    try {
      const clients = await this.request<UnifiRawClient[]>(config, '/stat/sta')

      const mapped: WifiClient[] = clients.map(c => ({
        mac: c.mac,
        ip: c.ip,
        hostname: c.hostname,
        name: c.name,
        authorized: c.authorized,
        isGuest: c.is_guest,
        uptime: c.uptime,
        txBytes: c.tx_bytes,
        rxBytes: c.rx_bytes,
      }))

      return guestsOnly ? mapped.filter(c => c.isGuest) : mapped
    } catch (error) {
      console.error('[UniFi] Error listing clients:', error)
      return []
    }
  }

  /**
   * Lista sites disponíveis no controller.
   */
  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    this.validateConfig(config)

    try {
      const sites = await this.requestGlobal<UnifiRawSite[]>(
        config,
        '/proxy/network/api/self/sites'
      )

      return sites.map(s => ({
        id: s.name,
        name: s.desc || s.name,
        description: s.desc,
      }))
    } catch (error) {
      console.error('[UniFi] Error listing sites:', error)
      return []
    }
  }

  /**
   * Lista dispositivos de rede (APs, switches, gateways).
   */
  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    this.validateConfig(config)

    try {
      const devices = await this.request<UnifiRawDevice[]>(config, '/stat/device')

      return devices.map(d => ({
        name: d.name || d.model,
        model: d.model,
        type: this.mapDeviceType(d.type),
        mac: d.mac,
        ip: d.ip,
        version: d.displayable_version || d.version,
        state: d.state === 1 ? 'online' : 'offline',
        clientCount: d.num_sta,
        guestCount: d.guest_num_sta,
      }))
    } catch (error) {
      console.error('[UniFi] Error listing devices:', error)
      return []
    }
  }

  // ============================================================================
  // EXTENDED METHODS (UniFi-specific, beyond base interface)
  // ============================================================================

  /**
   * Consulta informações do controlador (versão, hostname).
   */
  async getControllerInfo(config: ControllerConfig): Promise<UnifiControllerInfo> {
    this.validateConfig(config)

    try {
      const sites = await this.requestGlobal<UnifiRawSite[]>(
        config,
        '/proxy/network/api/self/sites'
      )

      // Informações básicas — versão completa requer endpoint /stat/sysinfo
      const sysInfo = await this.request<Array<{ version?: string; hostname?: string }>>(
        config,
        '/stat/sysinfo'
      ).catch(() => [])

      return {
        name: sites[0]?.desc || 'UniFi Controller',
        version: sysInfo[0]?.version,
        hostname: sysInfo[0]?.hostname,
      }
    } catch (error) {
      console.error('[UniFi] Error getting controller info:', error)
      return {}
    }
  }

  /**
   * Cria vouchers no controlador UniFi.
   *
   * @param config - Configuração do controller
   * @param params - Parâmetros do voucher
   * @returns Lista de códigos gerados
   */
  async createVouchers(
    config: ControllerConfig,
    params: CreateVoucherParams
  ): Promise<UnifiVoucher[]> {
    this.validateConfig(config)

    try {
      const response = await this.request<UnifiRawVoucher[]>(config, '/cmd/hotspot', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'create-voucher',
          n: params.count,
          expire: params.durationMinutes,
          quota: params.maxUses || 1,
          note: params.note || '',
          up: params.speedLimitUp || undefined,
          down: params.speedLimitDown || undefined,
        }),
      })

      // UniFi retorna o create_time como referência — precisamos listar para obter os códigos
      const vouchers = await this.listVouchers(config)

      // Retornar os vouchers mais recentes (criados agora)
      return vouchers.slice(0, params.count)
    } catch (error) {
      console.error('[UniFi] Error creating vouchers:', error)
      throw new ControllerConnectionError(
        'unifi',
        error instanceof Error ? error.message : 'Erro ao criar vouchers',
        error
      )
    }
  }

  /**
   * Lista todos os vouchers do site.
   */
  async listVouchers(config: ControllerConfig): Promise<UnifiVoucher[]> {
    this.validateConfig(config)

    try {
      const vouchers = await this.request<UnifiRawVoucher[]>(config, '/stat/voucher')

      return vouchers.map(v => ({
        id: v._id,
        code: this.formatVoucherCode(v.code),
        durationMinutes: v.duration,
        maxUses: v.quota || 1,
        usedCount: v.used || 0,
        note: v.note,
        createdAt: new Date(v.create_time * 1000),
      }))
    } catch (error) {
      console.error('[UniFi] Error listing vouchers:', error)
      return []
    }
  }

  /**
   * Remove um voucher pelo ID.
   */
  async deleteVoucher(config: ControllerConfig, voucherId: string): Promise<boolean> {
    this.validateConfig(config)

    try {
      await this.request(config, '/cmd/hotspot', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'delete-voucher',
          _id: voucherId,
        }),
      })
      return true
    } catch (error) {
      console.error('[UniFi] Error deleting voucher:', error)
      return false
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Mapeia o tipo de device UniFi para o tipo genérico.
   */
  private mapDeviceType(unifiType: string): 'ap' | 'switch' | 'gateway' | 'other' {
    switch (unifiType) {
      case 'uap':
        return 'ap'
      case 'usw':
        return 'switch'
      case 'ugw':
      case 'udm':
      case 'usg':
      case 'uxg':
        return 'gateway'
      default:
        return 'other'
    }
  }

  /**
   * Formata o código de voucher UniFi (insere hífens para legibilidade).
   * UniFi retorna códigos sem separação: "1234567890"
   * Formatado: "12345-67890"
   */
  private formatVoucherCode(code: string): string {
    if (code.length === 10) {
      return `${code.slice(0, 5)}-${code.slice(5)}`
    }
    return code
  }

  /**
   * Limpa cache de sessão (útil para forçar re-login).
   */
  static clearSessionCache(baseUrl?: string): void {
    if (baseUrl) {
      UnifiAdapter.sessionCache.delete(baseUrl)
    } else {
      UnifiAdapter.sessionCache.clear()
    }
  }
}
