/**
 * MikroTik Adapter — Implementação do WifiControllerAdapter para RouterOS
 *
 * Compatível com: RouterOS 6.x/7.x via REST API (ou SSH/API port 8728)
 *
 * Status: STUB — Estrutura pronta para implementação futura.
 * Ao implementar, o restante da aplicação NÃO precisará ser alterado.
 *
 * Endpoints típicos do RouterOS REST API (v7+):
 * - POST /rest/ip/hotspot/active/print
 * - POST /rest/ip/hotspot/user/add
 * - POST /rest/ip/hotspot/user/remove
 * - POST /rest/ip/hotspot/host/print
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

export class MikrotikAdapter implements WifiControllerAdapter {
  readonly type = 'mikrotik' as const

  // --- Capabilities ---

  private static readonly SUPPORTED_CAPABILITIES: ControllerCapability[] = [
    'authorize',
    'deauthorize',
    'kick',
    'list-clients',
    'bandwidth-limit',
  ]

  supports(capability: ControllerCapability): boolean {
    return MikrotikAdapter.SUPPORTED_CAPABILITIES.includes(capability)
  }

  // --- Validation ---

  private validateConfig(config: ControllerConfig): void {
    if (!config.baseUrl) {
      throw new ControllerNotConfiguredError('mikrotik')
    }
    if (!config.credentials.username || !config.credentials.password) {
      throw new ControllerNotConfiguredError('mikrotik')
    }
  }

  // --- Interface Implementation (STUBS) ---

  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // RouterOS REST API: GET /rest/system/identity
    // Ou via API port: /system/identity/print

    return {
      success: false,
      message: 'MikroTik adapter not implemented yet',
    }
  }

  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // RouterOS Hotspot: POST /rest/ip/hotspot/user/add
    // Body: { name: mac, password: mac, limit-uptime: "2h", rate-limit: "5M/10M" }
    //
    // Ou via Hotspot IP binding:
    // POST /rest/ip/hotspot/ip-binding/add
    // { mac-address: mac, type: "bypassed" }

    return {
      success: false,
      error: 'MikroTik adapter not implemented yet',
    }
  }

  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar
    // RouterOS: remover user do hotspot + kick active session
    // POST /rest/ip/hotspot/user/remove { .id: userId }
    // POST /rest/ip/hotspot/active/remove { .id: activeId }

    return {
      success: false,
      error: 'MikroTik adapter not implemented yet',
    }
  }

  async kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    this.validateConfig(config)

    // TODO: Implementar
    // POST /rest/ip/hotspot/active/remove (filtrar por mac-address)

    return { success: false, error: 'MikroTik adapter not implemented yet' }
  }

  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    this.validateConfig(config)

    // TODO: Implementar
    // POST /rest/ip/hotspot/active/print
    // Mapear para WifiClient[]

    return []
  }

  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    // MikroTik não tem conceito de sites (é por router)
    return []
  }

  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    this.validateConfig(config)

    // TODO: Implementar
    // Listar interfaces wireless: /rest/interface/wireless/print
    // Ou CAPsMAN managed APs: /rest/caps-man/remote-cap/print

    return []
  }
}
