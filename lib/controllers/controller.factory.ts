/**
 * ControllerFactory — Instancia o adapter correto baseado no tipo do controller
 *
 * Padrão Factory Method: centraliza a criação de adapters.
 * A aplicação nunca faz `new UnifiAdapter()` diretamente.
 * Sempre pede ao factory: `ControllerFactory.create('unifi')`.
 *
 * Para adicionar um novo fabricante:
 * 1. Criar o adapter em lib/controllers/adapters/novo.adapter.ts
 * 2. Registrar aqui no ADAPTER_REGISTRY
 * 3. Pronto — nenhuma outra alteração necessária
 *
 * Princípios:
 * - OCP: adicionar fabricante = registrar no registry, zero alteração no resto
 * - SRP: esta classe só sabe criar adapters, não orquestrar operações
 * - DIP: retorna WifiControllerAdapter (abstração), nunca a implementação concreta
 */

import type { WifiControllerAdapter } from './wifi-controller.adapter'
import type { ControllerType, ControllerConfig } from './types'
import { UnifiAdapter, UnifiCloudAdapter, ArubaAdapter, MikrotikAdapter, OmadaAdapter } from './adapters'

/**
 * Registry de adapters disponíveis.
 * Cada entrada mapeia um ControllerType para uma função que cria o adapter.
 *
 * Para registrar um novo adapter:
 *   ADAPTER_REGISTRY.set('novoFabricante', () => new NovoAdapter())
 */
const ADAPTER_REGISTRY = new Map<ControllerType, () => WifiControllerAdapter>([
  ['unifi', () => new UnifiAdapter()],
  ['unifi-cloud', () => new UnifiCloudAdapter()],
  ['aruba', () => new ArubaAdapter()],
  ['mikrotik', () => new MikrotikAdapter()],
  ['omada', () => new OmadaAdapter()],
])

export class ControllerFactory {
  /**
   * Cria um adapter para o tipo de controller especificado.
   *
   * @param type - Tipo do controlador (unifi, aruba, mikrotik, omada)
   * @returns Instância do adapter correspondente
   * @throws Error se o tipo não estiver registrado
   *
   * @example
   * const adapter = ControllerFactory.create('unifi')
   * const result = await adapter.authorizeGuest(config, params)
   */
  static create(type: ControllerType): WifiControllerAdapter {
    const factory = ADAPTER_REGISTRY.get(type)

    if (!factory) {
      throw new Error(
        `[ControllerFactory] Adapter não registrado para tipo: "${type}". ` +
        `Tipos disponíveis: ${Array.from(ADAPTER_REGISTRY.keys()).join(', ')}`
      )
    }

    return factory()
  }

  /**
   * Cria um adapter a partir de um ControllerConfig completo.
   * Conveniência que extrai o type do config.
   *
   * @param config - Configuração completa do controller
   * @returns Instância do adapter correspondente
   *
   * @example
   * const adapter = ControllerFactory.fromConfig(config)
   * const result = await adapter.testConnection(config)
   */
  static fromConfig(config: ControllerConfig): WifiControllerAdapter {
    return ControllerFactory.create(config.type)
  }

  /**
   * Retorna todos os tipos de controller suportados.
   * Útil para popular dropdowns na UI de configuração.
   */
  static getSupportedTypes(): ControllerType[] {
    return Array.from(ADAPTER_REGISTRY.keys())
  }

  /**
   * Verifica se um tipo de controller é suportado.
   */
  static isSupported(type: string): type is ControllerType {
    return ADAPTER_REGISTRY.has(type as ControllerType)
  }

  /**
   * Registra um novo adapter em runtime.
   * Útil para plugins/extensões futuras.
   *
   * @param type - Tipo do controller
   * @param factory - Função que cria a instância do adapter
   *
   * @example
   * ControllerFactory.register('cisco', () => new CiscoAdapter())
   */
  static register(type: ControllerType, factory: () => WifiControllerAdapter): void {
    ADAPTER_REGISTRY.set(type, factory)
  }
}
