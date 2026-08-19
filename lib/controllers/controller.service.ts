/**
 * ControllerService — Orquestrador de operações com controladores WiFi
 *
 * Esta é a ÚNICA classe que o restante da aplicação deve usar para
 * interagir com controladores WiFi. Ela:
 *
 * 1. Resolve qual adapter usar (via Factory)
 * 2. Monta o ControllerConfig a partir dos settings do portal
 * 3. Delega a operação ao adapter correto
 * 4. Trata erros de forma uniforme
 * 5. Faz logging estruturado
 *
 * A aplicação (server actions, API routes) NUNCA deve:
 * - Importar adapters diretamente
 * - Instanciar controllers manualmente
 * - Conhecer detalhes de fabricantes
 *
 * Princípios:
 * - Facade: interface simplificada sobre a complexidade dos adapters
 * - SRP: orquestra, não implementa lógica de fabricante
 * - DIP: depende apenas de WifiControllerAdapter (abstração)
 */

import { ControllerFactory } from './controller.factory'
import { decryptSecret } from '../secret-crypto'
import type { WifiControllerAdapter, ControllerCapability } from './wifi-controller.adapter'
import type {
  ControllerType,
  ControllerConfig,
  AuthorizeGuestParams,
  AuthorizeGuestResult,
  DeauthorizeGuestParams,
  DeauthorizeGuestResult,
  WifiClient,
  ConnectionTestResult,
  ControllerSite,
  NetworkDevice,
} from './types'

/**
 * Configuração simplificada vinda do portal_settings do banco.
 * O ControllerService traduz isso para ControllerConfig.
 */
export interface PortalControllerSettings {
  controllerType: string | null
  unifiEnabled?: boolean | null
  arubaEnabled?: boolean | null
  // UniFi (local — login por cookie)
  unifiControllerUrl?: string | null
  unifiUsername?: string | null
  unifiPassword?: string | null // pode estar criptografado (ver lib/secret-crypto)
  unifiSite?: string | null
  // UniFi Cloud (Site Manager API + Connector Proxy)
  unifiApiKey?: string | null // pode estar criptografado (ver lib/secret-crypto)
  unifiConsoleId?: string | null
  unifiSiteId?: string | null
  // Aruba
  arubaControllerUrl?: string | null
  arubaClientId?: string | null
  arubaClientSecret?: string | null // pode estar criptografado (ver lib/secret-crypto)
}

export class ControllerService {
  /**
   * Autoriza um guest no controller configurado.
   *
   * @param settings - Settings do portal (vindo do banco)
   * @param params - Parâmetros de autorização
   * @param detectedType - Tipo detectado automaticamente pelos parâmetros da URL do AP (opcional)
   * @returns Resultado da autorização
   *
   * @example
   * const result = await ControllerService.authorizeGuest(
   *   portalSettings,
   *   { macAddress: 'aa:bb:cc:dd:ee:ff', sessionMinutes: 120 },
   *   'unifi' // detectado pela URL
   * )
   */
  static async authorizeGuest(
    settings: PortalControllerSettings,
    params: AuthorizeGuestParams,
    detectedType?: ControllerType | null
  ): Promise<AuthorizeGuestResult> {
    const resolved = this.resolveController(settings, detectedType)

    if (!resolved) {
      // Nenhum controller configurado — sessão criada sem autorização no AP
      console.log('[ControllerService] No controller configured, skipping authorization')
      return { success: true }
    }

    const { adapter, config } = resolved

    try {
      console.log(`[ControllerService] Authorizing ${params.macAddress} via ${adapter.type}`)
      const result = await adapter.authorizeGuest(config, params)

      if (!result.success) {
        console.error(`[ControllerService] Authorization failed: ${result.error}`)
      }

      return result
    } catch (error) {
      console.error(`[ControllerService] Authorization error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao autorizar',
      }
    }
  }

  /**
   * Revoga autorização + kick de um guest.
   */
  static async deauthorizeGuest(
    settings: PortalControllerSettings,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    const resolved = this.resolveController(settings)

    if (!resolved) {
      return { success: true }
    }

    const { adapter, config } = resolved

    try {
      console.log(`[ControllerService] Deauthorizing ${params.macAddress} via ${adapter.type}`)
      const result = await adapter.deauthorizeGuest(config, params)

      // Se suporta kick, também força desconexão
      if (adapter.supports('kick')) {
        await adapter.kickClient(config, params.macAddress)
      }

      return result
    } catch (error) {
      console.error(`[ControllerService] Deauthorization error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao desautorizar',
      }
    }
  }

  /**
   * Testa conexão com o controller.
   */
  static async testConnection(
    settings: PortalControllerSettings,
    type?: ControllerType
  ): Promise<ConnectionTestResult> {
    const targetType = type || this.getConfiguredType(settings)

    if (!targetType) {
      return { success: false, message: 'Nenhum controller configurado' }
    }

    const config = this.buildConfig(settings, targetType)

    if (!config) {
      return { success: false, message: `Configuração incompleta para ${targetType}` }
    }

    const adapter = ControllerFactory.create(targetType)

    try {
      return await adapter.testConnection(config)
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro de conexão',
      }
    }
  }

  /**
   * Lista clientes conectados.
   */
  static async getConnectedClients(
    settings: PortalControllerSettings,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    const resolved = this.resolveController(settings)
    if (!resolved) return []

    const { adapter, config } = resolved

    if (!adapter.supports('list-clients')) return []

    try {
      return await adapter.getConnectedClients(config, guestsOnly)
    } catch (error) {
      console.error('[ControllerService] Error listing clients:', error)
      return []
    }
  }

  /**
   * Lista sites/locais do controller.
   */
  static async getSites(
    settings: PortalControllerSettings,
    type?: ControllerType
  ): Promise<ControllerSite[]> {
    const targetType = type || this.getConfiguredType(settings)
    if (!targetType) return []

    const config = this.buildConfig(settings, targetType)
    if (!config) return []

    const adapter = ControllerFactory.create(targetType)
    if (!adapter.supports('list-sites')) return []

    try {
      return await adapter.getSites(config)
    } catch (error) {
      console.error('[ControllerService] Error listing sites:', error)
      return []
    }
  }

  /**
   * Lista dispositivos de rede.
   */
  static async getDevices(
    settings: PortalControllerSettings
  ): Promise<NetworkDevice[]> {
    const resolved = this.resolveController(settings)
    if (!resolved) return []

    const { adapter, config } = resolved

    if (!adapter.supports('list-devices')) return []

    try {
      return await adapter.getDevices(config)
    } catch (error) {
      console.error('[ControllerService] Error listing devices:', error)
      return []
    }
  }

  /**
   * Verifica se o controller configurado suporta uma capability.
   */
  static supportsCapability(
    settings: PortalControllerSettings,
    capability: ControllerCapability
  ): boolean {
    const type = this.getConfiguredType(settings)
    if (!type) return false

    const adapter = ControllerFactory.create(type)
    return adapter.supports(capability)
  }

  /**
   * Retorna os tipos de controller suportados pelo sistema.
   */
  static getSupportedTypes(): ControllerType[] {
    return ControllerFactory.getSupportedTypes()
  }

  // --- Private Helpers ---

  /**
   * Resolve qual controller usar baseado em:
   * 1. Tipo detectado automaticamente (pelo AP redirect params)
   * 2. Tipo configurado no portal_settings
   * 3. Em modo 'both': prioriza detectedType, depois primeiro habilitado
   */
  private static resolveController(
    settings: PortalControllerSettings,
    detectedType?: ControllerType | null
  ): { adapter: WifiControllerAdapter; config: ControllerConfig } | null {
    const configuredType = settings.controllerType

    if (!configuredType || configuredType === 'none') {
      return null
    }

    let targetType: ControllerType | null = null

    if (configuredType === 'both') {
      // Modo dual: prioridade para o detectado, depois primeiro habilitado
      if (detectedType && this.isEnabled(settings, detectedType)) {
        targetType = detectedType
      } else if (settings.unifiEnabled) {
        targetType = 'unifi'
      } else if (settings.arubaEnabled) {
        targetType = 'aruba'
      }
    } else if (ControllerFactory.isSupported(configuredType)) {
      targetType = configuredType as ControllerType
    }

    if (!targetType) return null

    const config = this.buildConfig(settings, targetType)
    if (!config) return null

    const adapter = ControllerFactory.create(targetType)

    return { adapter, config }
  }

  /**
   * Monta o ControllerConfig a partir dos settings do portal.
   */
  private static buildConfig(
    settings: PortalControllerSettings,
    type: ControllerType
  ): ControllerConfig | null {
    switch (type) {
      case 'unifi': {
        if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
          return null
        }
        return {
          type: 'unifi',
          baseUrl: settings.unifiControllerUrl,
          credentials: {
            username: settings.unifiUsername,
            // Segredo descriptografado apenas aqui, no servidor, na hora do uso.
            password: decryptSecret(settings.unifiPassword),
            site: settings.unifiSite || 'default',
          },
        }
      }

      case 'unifi-cloud': {
        // Cloud usa API key + console (hostId) do Site Manager; o site é o siteId
        // da Integration API. A baseUrl fica implícita no adapter (api.ui.com).
        if (!settings.unifiApiKey || !settings.unifiConsoleId || !settings.unifiSiteId) {
          return null
        }
        return {
          type: 'unifi-cloud',
          baseUrl: 'https://api.ui.com',
          credentials: {
            apiKey: decryptSecret(settings.unifiApiKey),
            site: settings.unifiSiteId,
          },
          options: {
            consoleId: settings.unifiConsoleId,
          },
        }
      }

      case 'aruba': {
        if (!settings.arubaControllerUrl) {
          return null
        }
        return {
          type: 'aruba',
          baseUrl: settings.arubaControllerUrl,
          credentials: {
            clientId: settings.arubaClientId || undefined,
            clientSecret: settings.arubaClientSecret
              ? decryptSecret(settings.arubaClientSecret)
              : undefined,
          },
        }
      }

      case 'mikrotik':
      case 'omada':
        // Futuro: montar config baseado em novos campos no portal_settings
        return null

      default:
        return null
    }
  }

  /**
   * Verifica se um tipo está habilitado no modo 'both'.
   */
  private static isEnabled(
    settings: PortalControllerSettings,
    type: ControllerType
  ): boolean {
    switch (type) {
      case 'unifi':
        return !!settings.unifiEnabled
      case 'aruba':
        return !!settings.arubaEnabled
      default:
        return false
    }
  }

  /**
   * Extrai o tipo configurado dos settings.
   */
  private static getConfiguredType(
    settings: PortalControllerSettings
  ): ControllerType | null {
    const type = settings.controllerType

    if (!type || type === 'none' || type === 'both') {
      // Em 'both', retorna o primeiro habilitado
      if (type === 'both') {
        if (settings.unifiEnabled) return 'unifi'
        if (settings.arubaEnabled) return 'aruba'
      }
      return null
    }

    return ControllerFactory.isSupported(type) ? (type as ControllerType) : null
  }
}
