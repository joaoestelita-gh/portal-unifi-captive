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

// Adapter cloud (métodos estáticos de descoberta usados na UI de setup)
export { UnifiCloudAdapter } from './adapters/unifi-cloud.adapter'

// Interface (para tipagem em parâmetros)
export type { WifiControllerAdapter, ControllerCapability } from './wifi-controller.adapter'

// Adapter-specific exports (Aruba redirect params)
export type { ArubaRedirectParams, ArubaAuthCredentials } from './adapters/aruba.adapter'

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

// Erros tipados (código normalizado + traceId)
export { ControllerApiError } from './errors'
export type { ControllerErrorCode, ControllerApi } from './errors'
