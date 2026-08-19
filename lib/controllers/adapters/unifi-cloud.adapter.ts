/**
 * UniFi Cloud Adapter — Integração via API oficial (Site Manager + Connector Proxy)
 *
 * Diferente de `unifi.adapter.ts` (que faz login por cookie no console LOCAL), este
 * adapter usa a **API Cloud oficial da Ubiquiti**:
 *
 *   - Site Manager API (base `https://api.ui.com/v1`, header `X-API-KEY`) para
 *     DESCOBERTA de consoles/sites.
 *   - Connector Proxy para alcançar a *Network Integration API v1* do console
 *     remotamente, SEM túnel/VPN:
 *       https://api.ui.com/v1/connector/consoles/{consoleId}/proxy/network/integration/v1/...
 *
 * Vantagem: o portal (na AWS) libera clientes em redes atrás de NAT sem exigir
 * conectividade direta com a controladora — basta uma API key gerada em unifi.ui.com.
 *
 * Autenticação: header `X-API-KEY` em toda requisição. TLS válido (cloud), então
 * NÃO usamos `rejectUnauthorized:false` como no adapter local.
 *
 * Princípios (iguais aos demais adapters):
 * - SRP: só traduz UniFi Cloud ↔ domínio.
 * - OCP/LSP: substituível por qualquer WifiControllerAdapter.
 *
 * NOTA sobre versionamento: a Integration API é versionada e alguns campos/endpoints
 * (em especial a AUTORIZAÇÃO de guest por MAC) variam conforme a versão do Network
 * instalada no console. Os pontos sensíveis estão isolados em constantes/métodos
 * marcados abaixo para ajuste de 1 linha, e a doc exata fica embutida no próprio
 * console em Settings → Integrations.
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
  ControllerNotConfiguredError,
} from '../types'
import type { CreateVoucherParams, UnifiVoucher } from './unifi.adapter'

// --- Envelopes da API ------------------------------------------------------

/** Envelope paginado da Integration API v1. */
interface IntegrationEnvelope<T> {
  offset?: number
  limit?: number
  count?: number
  totalCount?: number
  data: T
}

/** Envelope da Site Manager API (api.ui.com/v1). */
interface SiteManagerEnvelope<T> {
  httpStatusCode?: number
  traceId?: string
  data: T
}

// --- Tipos crus (internos, nunca exportados) -------------------------------

/** Console retornado por GET /v1/hosts (Site Manager). */
interface CloudHost {
  id: string
  hardwareId?: string
  ipAddress?: string
  reportedState?: {
    hostname?: string
    name?: string
    version?: string
  }
}

interface IntegrationSite {
  id: string
  name?: string
  desc?: string
}

interface IntegrationClient {
  id: string
  name?: string
  hostname?: string
  ipAddress?: string
  macAddress?: string
  connectedAt?: string
  // Campo de guest varia por versão; tratamos defensivamente em mapClient().
  access?: { type?: string }
  type?: string
  uplinkDeviceId?: string
}

interface IntegrationDevice {
  id: string
  name?: string
  model?: string
  macAddress?: string
  ipAddress?: string
  state?: string // 'ONLINE' | 'OFFLINE'
  version?: string
  type?: string // 'ACCESS_POINT' | 'SWITCH' | 'GATEWAY' | ...
}

interface IntegrationVoucher {
  id: string
  code?: string
  name?: string
  createdAt?: string
  timeLimitMinutes?: number
  authorizedGuestLimit?: number
  authorizedGuestCount?: number
}

// ============================================================================
// AUTORIZAÇÃO DE GUEST — ponto sensível a versão (ajuste aqui se necessário)
// ============================================================================

/**
 * Ação de autorização de guest na Integration API. Em algumas versões o endpoint
 * é `POST /sites/{siteId}/clients/{clientId}/actions` com `{ action: 'AUTHORIZE_GUEST_ACCESS', ... }`.
 * Confirme a spec exata no console (Settings → Integrations).
 */
const AUTHORIZE_GUEST_ACTION = 'AUTHORIZE_GUEST_ACCESS'
const UNAUTHORIZE_GUEST_ACTION = 'UNAUTHORIZE_GUEST_ACCESS'

// ============================================================================
// UNIFI CLOUD ADAPTER
// ============================================================================

export class UnifiCloudAdapter implements WifiControllerAdapter {
  readonly type = 'unifi-cloud' as const

  private static readonly SUPPORTED_CAPABILITIES: ControllerCapability[] = [
    'authorize',
    'deauthorize',
    'list-clients',
    'list-sites',
    'list-devices',
    'bandwidth-limit',
  ]

  supports(capability: ControllerCapability): boolean {
    return UnifiCloudAdapter.SUPPORTED_CAPABILITIES.includes(capability)
  }

  // ==========================================================================
  // URL / REQUEST
  // ==========================================================================

  private getApiKey(config: ControllerConfig): string {
    const apiKey = config.credentials.apiKey
    if (!apiKey) {
      throw new ControllerNotConfiguredError('unifi-cloud')
    }
    return apiKey
  }

  private getConsoleId(config: ControllerConfig): string {
    const consoleId = (config.options?.consoleId as string | undefined) || undefined
    if (!consoleId) {
      throw new ControllerNotConfiguredError('unifi-cloud')
    }
    return consoleId
  }

  private baseUrl(config: ControllerConfig): string {
    // Default api.ui.com; permite override via config.baseUrl para ambientes de teste.
    return (config.baseUrl || 'https://api.ui.com').replace(/\/+$/, '')
  }

  /** Prefixo do Connector Proxy até a Integration API v1 do console. */
  private proxyBase(config: ControllerConfig): string {
    const consoleId = this.getConsoleId(config)
    return `${this.baseUrl(config)}/v1/connector/consoles/${consoleId}/proxy/network/integration/v1`
  }

  /** Requisição à Integration API v1 (via Connector Proxy). Retorna `data`. */
  private async request<T>(
    config: ControllerConfig,
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.proxyBase(config)}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': this.getApiKey(config),
        ...(options?.headers || {}),
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new ControllerConnectionError(
        'unifi-cloud',
        `API request failed: ${response.status} ${endpoint}${body ? ` — ${body.slice(0, 200)}` : ''}`,
        { status: response.status, endpoint, body: body.slice(0, 300) }
      )
    }

    const json = (await response.json()) as IntegrationEnvelope<T>
    return json.data
  }

  /** Requisição direta à Site Manager API (api.ui.com/v1), sem proxy. */
  private async requestCloud<T>(
    apiKey: string,
    baseUrl: string,
    endpoint: string
  ): Promise<T> {
    const url = `${baseUrl.replace(/\/+$/, '')}/v1${endpoint}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-API-KEY': apiKey,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new ControllerConnectionError(
        'unifi-cloud',
        `Site Manager request failed: ${response.status} ${endpoint}`,
        { status: response.status, endpoint, body: body.slice(0, 300) }
      )
    }

    const json = (await response.json()) as SiteManagerEnvelope<T>
    return json.data
  }

  // ==========================================================================
  // VALIDAÇÃO
  // ==========================================================================

  private validateConfig(config: ControllerConfig): void {
    if (!config.credentials.apiKey) {
      throw new ControllerNotConfiguredError('unifi-cloud')
    }
  }

  // ==========================================================================
  // DESCOBERTA (Site Manager — usado pela UI de setup)
  // ==========================================================================

  /**
   * Lista os consoles UniFi OS da conta (GET /v1/hosts).
   * Static porque roda no setup, antes de existir um consoleId configurado.
   */
  static async listConsoles(
    apiKey: string,
    baseUrl = 'https://api.ui.com'
  ): Promise<Array<{ id: string; name: string; ip?: string; version?: string }>> {
    const adapter = new UnifiCloudAdapter()
    const hosts = await adapter.requestCloud<CloudHost[]>(apiKey, baseUrl, '/hosts')
    return (hosts || []).map((h) => ({
      id: h.id,
      name: h.reportedState?.name || h.reportedState?.hostname || h.id,
      ip: h.ipAddress,
      version: h.reportedState?.version,
    }))
  }

  /**
   * Lista os sites de um console específico (via Connector Proxy).
   * Usa uma config mínima montada só com apiKey + consoleId.
   */
  static async listSitesForConsole(
    apiKey: string,
    consoleId: string,
    baseUrl = 'https://api.ui.com'
  ): Promise<ControllerSite[]> {
    const adapter = new UnifiCloudAdapter()
    const config: ControllerConfig = {
      type: 'unifi-cloud',
      baseUrl,
      credentials: { apiKey },
      options: { consoleId },
    }
    // Usa request() diretamente (que PROPAGA o erro) em vez de getSites(), que
    // engole exceções e retornaria [] — mascarando 403 (não-owner)/offline no setup.
    const sites = await adapter.request<IntegrationSite[]>(config, '/sites')
    return (sites || []).map((s) => ({
      id: s.id,
      name: s.name || s.desc || s.id,
      description: s.desc,
    }))
  }

  // ==========================================================================
  // INTERFACE
  // ==========================================================================

  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    try {
      // Sem consoleId ainda? valida ao menos a API key contra o Site Manager.
      const consoleId = config.options?.consoleId as string | undefined
      if (!consoleId) {
        const consoles = await UnifiCloudAdapter.listConsoles(
          this.getApiKey(config),
          this.baseUrl(config)
        )
        return {
          success: true,
          message: 'API key válida. Selecione um console e um site.',
          details: { totalConsoles: consoles.length },
        }
      }

      const sites = await this.getSites(config)
      const currentSite = sites.find((s) => s.id === config.credentials.site)
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso!',
        details: {
          siteName: currentSite?.name || config.credentials.site || 'default',
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

  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return { success: false, error: 'Site não configurado' }

    try {
      const clientId = await this.resolveClientId(config, siteId, params.macAddress)
      if (!clientId) {
        return {
          success: false,
          error: `Cliente ${params.macAddress} ainda não visível na controladora. Ele precisa estar conectado ao SSID de hotspot.`,
        }
      }

      await this.request(config, `/sites/${siteId}/clients/${clientId}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action: AUTHORIZE_GUEST_ACTION,
          timeLimitMinutes: params.sessionMinutes,
          rxRateLimitKbps: params.speedLimitDown || undefined,
          txRateLimitKbps: params.speedLimitUp || undefined,
        }),
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao autorizar'
      console.error(`[UniFi Cloud] Authorization failed for ${params.macAddress}:`, error)
      return { success: false, error: message }
    }
  }

  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return { success: false, error: 'Site não configurado' }

    try {
      const clientId = await this.resolveClientId(config, siteId, params.macAddress)
      if (!clientId) return { success: true } // já não está lá

      await this.request(config, `/sites/${siteId}/clients/${clientId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action: UNAUTHORIZE_GUEST_ACTION }),
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao desautorizar',
      }
    }
  }

  async kickClient(): Promise<{ success: boolean; error?: string }> {
    // A Integration API não expõe kick direto; deauthorize já remove o acesso.
    return { success: false, error: 'kick não suportado via UniFi Cloud' }
  }

  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return []

    try {
      const clients = await this.request<IntegrationClient[]>(
        config,
        `/sites/${siteId}/clients`
      )
      const mapped = (clients || []).map((c) => this.mapClient(c))
      return guestsOnly ? mapped.filter((c) => c.isGuest) : mapped
    } catch (error) {
      console.error('[UniFi Cloud] Error listing clients:', error)
      return []
    }
  }

  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    this.validateConfig(config)
    try {
      const sites = await this.request<IntegrationSite[]>(config, '/sites')
      return (sites || []).map((s) => ({
        id: s.id,
        name: s.name || s.desc || s.id,
        description: s.desc,
      }))
    } catch (error) {
      console.error('[UniFi Cloud] Error listing sites:', error)
      return []
    }
  }

  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return []

    try {
      const devices = await this.request<IntegrationDevice[]>(
        config,
        `/sites/${siteId}/devices`
      )
      return (devices || []).map((d) => ({
        name: d.name || d.model || d.id,
        model: d.model || '',
        type: this.mapDeviceType(d.type),
        mac: d.macAddress || '',
        ip: d.ipAddress || '',
        version: d.version,
        state: (d.state || '').toUpperCase() === 'ONLINE' ? 'online' : 'offline',
      }))
    } catch (error) {
      console.error('[UniFi Cloud] Error listing devices:', error)
      return []
    }
  }

  // ==========================================================================
  // VOUCHERS (Integration API v1)
  // ==========================================================================

  async createVouchers(
    config: ControllerConfig,
    params: CreateVoucherParams
  ): Promise<UnifiVoucher[]> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) throw new ControllerNotConfiguredError('unifi-cloud')

    try {
      const created = await this.request<IntegrationVoucher[]>(
        config,
        `/sites/${siteId}/hotspot/vouchers`,
        {
          method: 'POST',
          body: JSON.stringify({
            count: params.count,
            name: params.note || undefined,
            authorizedGuestLimit: params.maxUses || 1,
            timeLimitMinutes: params.durationMinutes,
            rxRateLimitKbps: params.speedLimitDown || undefined,
            txRateLimitKbps: params.speedLimitUp || undefined,
          }),
        }
      )
      return (created || []).map((v) => this.mapVoucher(v))
    } catch (error) {
      console.error('[UniFi Cloud] Error creating vouchers:', error)
      throw new ControllerConnectionError(
        'unifi-cloud',
        error instanceof Error ? error.message : 'Erro ao criar vouchers',
        error
      )
    }
  }

  async listVouchers(config: ControllerConfig): Promise<UnifiVoucher[]> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return []

    try {
      const vouchers = await this.request<IntegrationVoucher[]>(
        config,
        `/sites/${siteId}/hotspot/vouchers`
      )
      return (vouchers || []).map((v) => this.mapVoucher(v))
    } catch (error) {
      console.error('[UniFi Cloud] Error listing vouchers:', error)
      return []
    }
  }

  async deleteVoucher(config: ControllerConfig, voucherId: string): Promise<boolean> {
    this.validateConfig(config)
    const siteId = config.credentials.site
    if (!siteId) return false

    try {
      await this.request(config, `/sites/${siteId}/hotspot/vouchers/${voucherId}`, {
        method: 'DELETE',
      })
      return true
    } catch (error) {
      console.error('[UniFi Cloud] Error deleting voucher:', error)
      return false
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /** Resolve o id interno do cliente a partir do MAC (a Integration API opera por id). */
  private async resolveClientId(
    config: ControllerConfig,
    siteId: string,
    macAddress: string
  ): Promise<string | null> {
    const target = macAddress.toLowerCase().replace(/-/g, ':')
    const clients = await this.request<IntegrationClient[]>(
      config,
      `/sites/${siteId}/clients`
    )
    const match = (clients || []).find(
      (c) => (c.macAddress || '').toLowerCase().replace(/-/g, ':') === target
    )
    return match?.id || null
  }

  private mapClient(c: IntegrationClient): WifiClient {
    const isGuest =
      (c.access?.type || c.type || '').toUpperCase().includes('GUEST')
    return {
      mac: c.macAddress || '',
      ip: c.ipAddress,
      hostname: c.hostname,
      name: c.name,
      authorized: true, // aparecer na lista de clients implica conectado
      isGuest,
    }
  }

  private mapVoucher(v: IntegrationVoucher): UnifiVoucher {
    return {
      id: v.id,
      code: v.code || '',
      durationMinutes: v.timeLimitMinutes || 0,
      maxUses: v.authorizedGuestLimit || 1,
      usedCount: v.authorizedGuestCount || 0,
      note: v.name,
      createdAt: v.createdAt ? new Date(v.createdAt) : new Date(0),
    }
  }

  private mapDeviceType(t?: string): 'ap' | 'switch' | 'gateway' | 'other' {
    switch ((t || '').toUpperCase()) {
      case 'ACCESS_POINT':
      case 'UAP':
        return 'ap'
      case 'SWITCH':
      case 'USW':
        return 'switch'
      case 'GATEWAY':
      case 'UGW':
      case 'UDM':
      case 'UXG':
        return 'gateway'
      default:
        return 'other'
    }
  }
}
