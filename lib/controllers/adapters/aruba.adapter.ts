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

  async testConnection(config: ControllerConfig): Promise<ConnectionTestResult> {
    this.validateConfig(config)

    // TODO: Implementar teste de conexão
    // Para Aruba Instant On: HEAD request ao baseUrl (aceitar 401/403/302 como "acessível")
    // Para Aruba Central: OAuth2 token request com client_credentials
    //
    // Fluxo:
    // 1. Tentar HEAD/GET no baseUrl
    // 2. Se responder (qualquer status), está acessível
    // 3. Se tiver clientId/clientSecret, tentar obter OAuth2 token

    throw new ControllerConnectionError(
      'aruba',
      'Not implemented yet — awaiting real API integration'
    )
  }

  async authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar autorização Aruba
    //
    // Fluxo RADIUS (principal):
    // 1. Receber switchip do params.extra (host do AP captive portal)
    // 2. Construir URL: https://{switchip}/cgi-bin/login?cmd=login&user={token}&password={token}
    // 3. Retornar { success: true, redirectUrl }
    //
    // Fluxo API (fallback, se clientId/clientSecret configurados):
    // 1. OAuth2 client_credentials → access_token
    // 2. POST /guest/v1/portals/authorize { mac_address, session_timeout, bandwidth_limit_* }
    // 3. Retornar { success: true }
    //
    // NOTA: O token RADIUS é gerado FORA deste adapter (pela camada de serviço)
    // e passado via params.extra.radiusToken

    return {
      success: false,
      error: 'Not implemented yet — awaiting real API integration',
    }
  }

  async deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult> {
    this.validateConfig(config)

    // TODO: Implementar revogação Aruba
    // Apenas disponível via Aruba Central API (clientId/clientSecret)
    // Aruba Instant On sem API não suporta deauthorize direto
    //
    // Fluxo (se API disponível):
    // 1. OAuth2 → access_token
    // 2. POST /guest/v1/portals/deauthorize { mac_address }
    //
    // Se não tiver API: retornar success=true (sessão expira naturalmente no AP)

    return {
      success: true, // Aruba expira naturalmente se não tiver API
    }
  }

  async kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }> {
    // Aruba Instant On NÃO suporta kick direto via API
    return {
      success: false,
      error: 'Aruba Instant On does not support direct client kick',
    }
  }

  async getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]> {
    // Aruba Instant On não expõe lista de clientes via API pública
    // Apenas disponível via Aruba Central (se configurado)
    return []
  }

  async getSites(config: ControllerConfig): Promise<ControllerSite[]> {
    // Aruba Instant On não tem conceito de multi-site na API pública
    return []
  }

  async getDevices(config: ControllerConfig): Promise<NetworkDevice[]> {
    // Aruba Instant On não expõe lista de devices via API pública
    return []
  }
}
