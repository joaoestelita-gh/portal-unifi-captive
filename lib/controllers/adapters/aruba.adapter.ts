/**
 * Aruba Instant On Adapter — Implementação do WifiControllerAdapter para HP Aruba
 *
 * Compatível com: Aruba Instant On (via RADIUS flow) e Aruba Central (via API)
 *
 * Fluxo principal (RADIUS):
 * 1. Portal valida credenciais do visitante
 * 2. Gera um token RADIUS single-use
 * 3. Redireciona o browser para /cgi-bin/login no AP com user=token&password=token
 * 4. AP envia token ao FreeRADIUS → FreeRADIUS valida via nosso REST endpoint
 * 5. RADIUS retorna Access-Accept com Session-Timeout
 *
 * Este adapter é "redirect-based": authorizeGuest retorna uma URL de redirect
 * ao invés de fazer uma chamada direta ao controller.
 *
 * Princípios:
 * - SRP: responsável apenas pela tradução Aruba ↔ domínio
 * - OCP: fechado para modificação
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
  ControllerNotConfiguredError,
} from '../types'

/**
 * Parâmetros enviados pelo AP Aruba Instant On no redirect do captive portal.
 * `switchip` é o host do captive portal ao qual devemos autenticar.
 */
export interface ArubaRedirectParams {
  mac?: string
  ip?: string
  essid?: string
  apname?: string
  apmac?: string
  vcname?: string
  switchip?: string
  url?: string
}

/**
 * Credenciais para o endpoint de login do AP Aruba.
 * Normalmente é o token RADIUS single-use.
 */
export interface ArubaAuthCredentials {
  user?: string
  password?: string
}

export class ArubaAdapter implements WifiControllerAdapter {
  readonly type = 'aruba' as const

  // --- Capabilities ---

  private static readonly SUPPORTED_CAPABILITIES: ControllerCapability[] = [
    'authorize',
    'deauthorize',
    'redirect-flow',
    'bandwidth-limit',
  ]

  supports(capability: ControllerCapability): boolean {
    return ArubaAdapter.SUPPORTED_CAPABILITIES.includes(capability)
  }

  // --- Validation ---

  private validateConfig(config: ControllerConfig): void {
    if (!config.baseUrl) {
      throw new ControllerNotConfiguredError('aruba')
    }
  }

  // --- Interface Implementation ---

  /**
   * Testa a conexão com o controller Aruba.
   * Para Instant On: verifica se o baseUrl responde (aceita 401/403/302).
   * Para Central: tenta obter OAuth2 token.
   */
  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    try {
      // Se tem credenciais API (Aruba Central), tenta OAuth2
      if (config.credentials.clientId && config.credentials.clientSecret) {
        const tokenUrl = `${config.baseUrl}/oauth2/token`
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.credentials.clientId,
            client_secret: config.credentials.clientSecret,
          }),
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          return {
            success: true,
            message: 'Conexão com Aruba Central estabelecida!',
            details: { method: 'oauth2' },
          }
        }
        return {
          success: false,
          message: `Aruba Central retornou status ${response.status}. Verifique clientId/clientSecret.`,
        }
      }

      // Instant On: simples verificação de acessibilidade
      const response = await fetch(config.baseUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })

      // 401/403/302 = servidor acessível (portal respondendo)
      if (response.ok || response.status === 401 || response.status === 403 || response.status === 302) {
        return {
          success: true,
          message: 'HP Aruba Instant On acessível!',
          details: { method: 'head-check', status: response.status },
        }
      }

      return {
        success: false,
        message: `HP Aruba retornou status ${response.status}`,
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
   * Autoriza um guest via redirect ao AP (RADIUS flow) ou via API (Central).
   *
   * Para o fluxo RADIUS:
   * - `params.extra.radiusToken` deve conter o token RADIUS single-use
   * - `params.extra.arubaParams` deve conter os parâmetros do redirect do AP
   * - `params.extra.finalRedirect` é a URL de destino após sucesso
   *
   * Retorna `redirectUrl` que o browser deve seguir para completar a autorização.
   */
  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    const extra = params.extra || {}
    const arubaParams = extra.arubaParams as ArubaRedirectParams | undefined
    const credentials = extra.credentials as ArubaAuthCredentials | undefined
    const finalRedirect = extra.finalRedirect as string | undefined

    // Tentar API primeiro se credenciais disponíveis
    if (config.credentials.clientId && config.credentials.clientSecret) {
      const apiResult = await this.authorizeViaApi(
        config,
        params.macAddress,
        params.sessionMinutes,
        params.speedLimitUp,
        params.speedLimitDown
      )
      if (apiResult) {
        return { success: true }
      }
    }

    // Fluxo RADIUS: construir URL de redirect para o AP
    const redirectUrl = this.buildRedirectUrl(config, arubaParams, credentials, finalRedirect)

    return { success: true, redirectUrl }
  }

  /**
   * Revoga autorização de um guest.
   * Disponível apenas via Aruba Central API.
   * Instant On sem API: sessão expira naturalmente no AP.
   */
  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    if (!config.credentials.clientId || !config.credentials.clientSecret) {
      // Sem API, sessão expira naturalmente
      return { success: true }
    }

    try {
      const accessToken = await this.getOAuthToken(config)
      if (!accessToken) return { success: true }

      const response = await fetch(`${config.baseUrl}/guest/v1/portals/deauthorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mac_address: params.macAddress.toLowerCase(),
        }),
      })

      return { success: response.ok }
    } catch (error) {
      console.error('[Aruba] Deauthorize error:', error)
      return { success: true } // Graceful — sessão expira naturalmente
    }
  }

  async kickClient(
    _config: ControllerConfig,
    _macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    // Aruba Instant On NÃO suporta kick direto via API
    return {
      success: false,
      error: 'Aruba Instant On does not support direct client kick',
    }
  }

  async getConnectedClients(
    _config: ControllerConfig,
    _guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    // Aruba Instant On não expõe lista de clientes via API pública
    return []
  }

  async getSites(_config: ControllerConfig): Promise<ControllerSite[]> {
    // Aruba Instant On não tem conceito de multi-site na API pública
    return []
  }

  async getDevices(_config: ControllerConfig): Promise<NetworkDevice[]> {
    // Aruba Instant On não expõe lista de devices via API pública
    return []
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Autoriza via Aruba Central API (OAuth2 + REST).
   * Retorna true se bem-sucedido, false se deve usar redirect fallback.
   */
  private async authorizeViaApi(
    config: ControllerConfig,
    macAddress: string,
    minutes: number,
    speedUp?: number,
    speedDown?: number
  ): Promise<boolean> {
    try {
      const accessToken = await this.getOAuthToken(config)
      if (!accessToken) return false

      const authResponse = await fetch(`${config.baseUrl}/guest/v1/portals/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mac_address: macAddress.toLowerCase(),
          session_timeout: minutes * 60, // Segundos
          bandwidth_limit_up: speedUp ? speedUp * 1000 : undefined, // Kbps → bps
          bandwidth_limit_down: speedDown ? speedDown * 1000 : undefined,
        }),
      })

      if (!authResponse.ok) {
        console.error('[Aruba] API authorize error:', await authResponse.text())
        return false
      }

      return true
    } catch (error) {
      console.error('[Aruba] API error:', error)
      return false
    }
  }

  /**
   * Obtém OAuth2 access token via client_credentials.
   */
  private async getOAuthToken(config: ControllerConfig): Promise<string | null> {
    if (!config.credentials.clientId || !config.credentials.clientSecret) {
      return null
    }

    try {
      const tokenUrl = `${config.baseUrl}/oauth2/token`
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.credentials.clientId,
          client_secret: config.credentials.clientSecret,
        }),
      })

      if (!response.ok) {
        console.error('[Aruba] Token error:', response.status)
        return null
      }

      const data = await response.json()
      return data.access_token
    } catch (error) {
      console.error('[Aruba] OAuth token error:', error)
      return null
    }
  }

  /**
   * Constrói a URL de redirect para autenticação no AP via RADIUS.
   *
   * O browser é redirecionado para /cgi-bin/login no host do captive portal
   * (switchip) com o token RADIUS como user/password.
   */
  private buildRedirectUrl(
    config: ControllerConfig,
    arubaParams?: ArubaRedirectParams,
    credentials?: ArubaAuthCredentials,
    finalRedirect?: string
  ): string {
    // Determinar o host de login. Prioridade: switchip do AP > URL configurada
    let authUrl: URL

    const switchip = arubaParams?.switchip?.trim()
    if (switchip) {
      let host = switchip
      if (!/^https?:\/\//i.test(host)) {
        host = `https://${host}`
      }
      const base = new URL(host)
      if (base.pathname === '/' || base.pathname === '') {
        base.pathname = '/cgi-bin/login'
      }
      authUrl = base
    } else {
      authUrl = new URL(config.baseUrl)
    }

    // Parâmetros do login ECP
    authUrl.searchParams.set('cmd', 'login')

    // Token RADIUS (single-use) como user e password
    const token = credentials?.password || credentials?.user || ''
    authUrl.searchParams.set('user', token)
    authUrl.searchParams.set('password', token)

    // URL de destino após sucesso
    const destination = finalRedirect || arubaParams?.url
    if (destination) authUrl.searchParams.set('url', destination)

    return authUrl.toString()
  }
}
