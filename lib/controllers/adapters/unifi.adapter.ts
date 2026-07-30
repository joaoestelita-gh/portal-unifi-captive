/**
 * UniFi Adapter — Implementação do WifiControllerAdapter para UniFi OS
 *
 * Compatível com: Cloud Key Gen2+, UDM, UDM Pro, UDR, UCG
 *
 * Este adapter traduz os comandos genéricos da interface WifiControllerAdapter
 * para chamadas HTTP específicas da API UniFi.
 *
 * A aplicação NUNCA importa este arquivo diretamente.
 * O acesso é sempre via ControllerFactory → WifiControllerAdapter.
 *
 * Princípios:
 * - SRP: responsável apenas pela tradução UniFi ↔ domínio
 * - OCP: fechado para modificação, aberto para extensão
 * - LSP: substituível por qualquer outro adapter sem quebrar o sistema
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

export class UnifiAdapter implements WifiControllerAdapter {
  readonly type = 'unifi' as const

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

  // --- Validation ---

  private validateConfig(config: ControllerConfig): void {
    if (!config.baseUrl) {
      throw new ControllerNotConfiguredError('unifi')
    }
    if (!config.credentials.username || !config.credentials.password) {
      throw new ControllerNotConfiguredError('unifi')
    }
  }

  // --- Interface Implementation ---

  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: POST {baseUrl}/api/auth/login
    // Depois: GET {baseUrl}/proxy/network/api/self/sites
    //
    // Fluxo:
    // 1. Login com username/password → obter cookie de sessão
    // 2. Listar sites para confirmar acesso
    // 3. Retornar nome do site + versão do controller

    throw new ControllerConnectionError(
      'unifi',
      'Not implemented yet — awaiting real API integration'
    )
  }

  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: POST {baseUrl}/proxy/network/api/s/{site}/cmd/stamgr
    // Body: {
    //   cmd: 'authorize-guest',
    //   mac: params.macAddress.toLowerCase(),
    //   minutes: params.sessionMinutes,
    //   up: params.speedLimitUp,     // Kbps
    //   down: params.speedLimitDown, // Kbps
    // }
    //
    // Fluxo:
    // 1. Login (ou reusar sessão)
    // 2. Enviar comando authorize-guest ao stamgr
    // 3. Retornar success (UniFi não usa redirect)

    throw new ControllerAuthorizationError(
      'unifi',
      params.macAddress,
      'Not implemented yet — awaiting real API integration'
    )
  }

  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: POST {baseUrl}/proxy/network/api/s/{site}/cmd/stamgr
    // Body: {
    //   cmd: 'unauthorize-guest',
    //   mac: params.macAddress.toLowerCase(),
    // }

    throw new ControllerAuthorizationError(
      'unifi',
      params.macAddress,
      'Not implemented yet — awaiting real API integration'
    )
  }

  async kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: POST {baseUrl}/proxy/network/api/s/{site}/cmd/stamgr
    // Body: {
    //   cmd: 'kick-sta',
    //   mac: macAddress.toLowerCase(),
    // }

    return { success: false, error: 'Not implemented yet' }
  }

  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: GET {baseUrl}/proxy/network/api/s/{site}/stat/sta
    // Mapear resposta para WifiClient[]
    // Se guestsOnly: filtrar por is_guest === true

    return []
  }

  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: GET {baseUrl}/proxy/network/api/self/sites
    // Mapear: { name, desc } → { id: name, name: desc }

    return []
  }

  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    this.validateConfig(config)

    // TODO: Implementar chamada real à API UniFi
    // Endpoint: GET {baseUrl}/proxy/network/api/s/{site}/stat/device
    // Mapear para NetworkDevice[] (type baseado em device.type: ugw→gateway, uap→ap, usw→switch)

    return []
  }
}
