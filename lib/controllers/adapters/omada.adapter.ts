/**
 * TP-Link Omada Adapter — Implementação do WifiControllerAdapter para Omada SDN
 *
 * Compatível com: Omada Controller (hardware OC200/OC300 ou software)
 *
 * Status: STUB — Estrutura pronta para implementação futura.
 * Ao implementar, o restante da aplicação NÃO precisará ser alterado.
 *
 * A API do Omada Controller é REST-based com autenticação via token:
 * - POST /openapi/authorize/token (login)
 * - POST /openapi/v1/{omadacId}/sites/{siteId}/cmd/clients/{mac}/authorize
 * - GET /openapi/v1/{omadacId}/sites/{siteId}/clients
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
import { ControllerNotConfiguredError } from '../types'

export class OmadaAdapter implements WifiControllerAdapter {
  readonly type = 'omada' as const

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
    return OmadaAdapter.SUPPORTED_CAPABILITIES.includes(capability)
  }

  // --- Validation ---

  private validateConfig(config: ControllerConfig): void {
    if (!config.baseUrl) {
      throw new ControllerNotConfiguredError('omada')
    }
    if (!config.credentials.clientId || !config.credentials.clientSecret) {
      throw new ControllerNotConfiguredError('omada')
    }
  }

  // --- Interface Implementation (STUBS) ---

  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // POST /openapi/authorize/token
    // Body: { omadacId, client_id, client_secret }
    // Se obtiver token → conexão OK

    return {
      success: false,
      message: 'Omada adapter not implemented yet',
    }
  }

  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // 1. Obter token: POST /openapi/authorize/token
    // 2. Autorizar: POST /openapi/v1/{omadacId}/sites/{siteId}/cmd/clients/{mac}/authorize
    //    Body: { authDuration: sessionMinutes * 60, trafficLimitEnable: true, ... }

    return {
      success: false,
      error: 'Omada adapter not implemented yet',
    }
  }

  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // POST /openapi/v1/{omadacId}/sites/{siteId}/cmd/clients/{mac}/unauthorize

    return {
      success: false,
      error: 'Omada adapter not implemented yet',
    }
  }

  async kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    this.validateConfig(config)

    // TODO: Implementar
    // DELETE /openapi/v1/{omadacId}/sites/{siteId}/clients/{mac}

    return { success: false, error: 'Omada adapter not implemented yet' }
  }

  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    this.validateConfig(config)

    // TODO: Implementar
    // GET /openapi/v1/{omadacId}/sites/{siteId}/clients?filters.active=true
    // Mapear para WifiClient[]

    return []
  }

  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    this.validateConfig(config)

    // TODO: Implementar
    // GET /openapi/v1/{omadacId}/sites
    // Mapear para ControllerSite[]

    return []
  }

  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    this.validateConfig(config)

    // TODO: Implementar
    // GET /openapi/v1/{omadacId}/sites/{siteId}/devices
    // Mapear tipo: EAP → ap, switch → switch, gateway → gateway

    return []
  }
}
