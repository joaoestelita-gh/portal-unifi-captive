/**
 * WifiControllerAdapter — Interface Abstrata (Contrato)
 *
 * Define o contrato que TODO adapter de controlador WiFi deve implementar.
 * A aplicação NUNCA conversa diretamente com um fabricante específico.
 * Toda comunicação passa por esta interface.
 *
 * Princípios aplicados:
 * - ISP (Interface Segregation): métodos coesos e focados
 * - DIP (Dependency Inversion): aplicação depende da abstração, não da implementação
 * - OCP (Open/Closed): novos fabricantes = nova classe, zero alteração aqui
 * - LSP (Liskov Substitution): qualquer adapter é substituível sem quebrar o sistema
 */

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

export interface WifiControllerAdapter {
  /**
   * Identifica o tipo do controller que este adapter gerencia.
   * Usado pelo factory para routing e pelo serviço para logging.
   */
  readonly type: ControllerType

  /**
   * Testa a conectividade com o controlador.
   * Deve validar credenciais e retornar informações básicas.
   *
   * @throws ControllerConnectionError se não conseguir conectar
   */
  testConnection(config: ControllerConfig): Promise<ConnectionTestResult>

  /**
   * Autoriza um dispositivo guest na rede WiFi.
   * O dispositivo poderá navegar pelo tempo definido em sessionMinutes.
   *
   * @param config - Configuração do controlador
   * @param params - Parâmetros da autorização (MAC, tempo, velocidade)
   * @returns Resultado com sucesso/falha e URL de redirect (se aplicável)
   */
  authorizeGuest(
    config: ControllerConfig,
    params: AuthorizeGuestParams
  ): Promise<AuthorizeGuestResult>

  /**
   * Revoga a autorização de um dispositivo guest.
   * O dispositivo será desconectado imediatamente (se o controller suportar).
   *
   * @param config - Configuração do controlador
   * @param params - Parâmetros (MAC address)
   */
  deauthorizeGuest(
    config: ControllerConfig,
    params: DeauthorizeGuestParams
  ): Promise<DeauthorizeGuestResult>

  /**
   * Desconecta (kick) um dispositivo da rede.
   * Diferente de deauthorize: o kick força desconexão imediata,
   * mas o dispositivo pode reconectar se ainda estiver autorizado.
   *
   * @param config - Configuração do controlador
   * @param macAddress - MAC do dispositivo
   */
  kickClient(
    config: ControllerConfig,
    macAddress: string
  ): Promise<{ success: boolean; error?: string }>

  /**
   * Lista os clientes atualmente conectados (todos ou apenas guests).
   *
   * @param config - Configuração do controlador
   * @param guestsOnly - Se true, retorna apenas visitantes
   */
  getConnectedClients(
    config: ControllerConfig,
    guestsOnly?: boolean
  ): Promise<WifiClient[]>

  /**
   * Lista os sites/locais disponíveis no controlador.
   * Nem todos os controllers suportam multi-site.
   *
   * @param config - Configuração do controlador
   * @returns Lista de sites ou array vazio se não suportado
   */
  getSites(config: ControllerConfig): Promise<ControllerSite[]>

  /**
   * Lista os dispositivos de rede (APs, switches, gateways).
   *
   * @param config - Configuração do controlador
   * @returns Lista de dispositivos ou array vazio se não suportado
   */
  getDevices(config: ControllerConfig): Promise<NetworkDevice[]>

  /**
   * Verifica se este adapter suporta uma determinada funcionalidade.
   * Útil para UI condicional (ex: Aruba não suporta kick direto).
   *
   * @param capability - Nome da funcionalidade
   */
  supports(capability: ControllerCapability): boolean
}

/**
 * Capacidades que um controller pode ou não suportar.
 * Permite que a UI adapte os botões/ações disponíveis.
 */
export type ControllerCapability =
  | 'authorize'       // Autorizar guest (todos devem suportar)
  | 'deauthorize'     // Revogar autorização
  | 'kick'            // Forçar desconexão
  | 'list-clients'    // Listar clientes conectados
  | 'list-sites'      // Listar sites/locais
  | 'list-devices'    // Listar dispositivos de rede
  | 'bandwidth-limit' // Controle de velocidade por cliente
  | 'redirect-flow'   // Autorização via redirect (Aruba RADIUS)
