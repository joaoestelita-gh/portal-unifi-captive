/**
 * Barrel export — Camada de Controllers
 *
 * Este é o ÚNICO ponto de entrada que o restante da aplicação deve importar.
 *
 * Uso na aplicação:
 *
 * ```typescript
 * import { ControllerService } from '@/lib/controllers'
 *
 * const result = await ControllerService.authorizeGuest(settings, params)
 * ```
 *
 * Para acesso ao factory (raro, apenas em configuração):
 *
 * ```typescript
 * import { ControllerFactory } from '@/lib/controllers'
 *
 * const types = ControllerFactory.getSupportedTypes()
 * ```
 */

// Service (principal — usar na aplicação)
export { ControllerService } from './controller.service'
export type { PortalControllerSettings } from './controller.service'

// Factory (configuração / admin)
export { ControllerFactory } from './controller.factory'

// Interface (para tipagem em parâmetros)
export type { WifiControllerAdapter, ControllerCapability } from './wifi-controller.adapter'

// Types (domínio compartilhado)
export type {
  ControllerType,
  ControllerConfig,
  ControllerCredentials,
  AuthorizeGuestParams,
  AuthorizeGuestResult,
  DeauthorizeGuestParams,
  DeauthorizeGuestResult,
  WifiClient,
  ConnectionTestResult,
  ControllerSite,
  NetworkDevice,
} from './types'

export {
  ControllerConnectionError,
  ControllerAuthorizationError,
  ControllerNotConfiguredError,
} from './types'
