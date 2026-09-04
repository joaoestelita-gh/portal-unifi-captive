/**
 * Erros tipados para as APIs de controlador (foco em UniFi Cloud).
 *
 * Motivação: até aqui os erros eram tratados por *substring match* na string
 * do `Error.message` (frágil). `ControllerApiError` normaliza o motivo real da
 * falha num `code` estável, capturando também status HTTP, endpoint, a API de
 * origem e o `traceId` da Ubiquiti (para escalar suporte).
 *
 * RETROCOMPATIBILIDADE: `ControllerApiError extends ControllerConnectionError`,
 * então todo `catch`/`instanceof ControllerConnectionError`/`.message`/
 * `.controllerType` existente continua funcionando. O payload de `originalError`
 * mantém `{ status, endpoint, body }` — apenas enriquecido com `code`/`traceId`.
 */

import { ControllerConnectionError, type ControllerType } from './types'

/** Motivo normalizado da falha — mapeado para mensagens de UI e persistido nos logs. */
export type ControllerErrorCode =
  | 'UNAUTHORIZED' // 401 / API key inválida
  | 'FORBIDDEN' // 403 genérico
  | 'NOT_OWNER' // proxy: "not the owner of this host"
  | 'DEVICE_OFFLINE' // proxy: "device_offline"
  | 'NOT_FOUND' // 404
  | 'RATE_LIMITED' // 429
  | 'SERVER_ERROR' // 5xx
  | 'TIMEOUT' // AbortSignal disparou
  | 'NETWORK' // DNS / conexão recusada / reset (ENOTFOUND, ECONNREFUSED, ...)
  | 'BAD_RESPONSE' // 2xx mas envelope JSON inválido
  | 'UNKNOWN'

export type ControllerApi = 'site-manager' | 'integration-proxy'

export interface ControllerApiErrorDetails {
  /** Status HTTP; `undefined` em erros de rede/timeout. */
  status?: number
  code: ControllerErrorCode
  /** Somente o path (ex.: `/sites/{id}/clients`), nunca host/headers. */
  endpoint: string
  api: ControllerApi
  /** `traceId` retornado pela Ubiquiti, quando presente. */
  traceId?: string
  /** Trecho do corpo de erro, truncado (<=300 chars). Nunca headers/segredos. */
  body?: string
}

export class ControllerApiError extends ControllerConnectionError {
  readonly code: ControllerErrorCode
  readonly status?: number
  readonly endpoint: string
  readonly api: ControllerApi
  readonly traceId?: string
  readonly body?: string

  constructor(controllerType: ControllerType, message: string, details: ControllerApiErrorDetails) {
    // Mantém originalError = details (com o shape {status,endpoint,body} preservado).
    super(controllerType, message, details)
    this.name = 'ControllerApiError'
    this.code = details.code
    this.status = details.status
    this.endpoint = details.endpoint
    this.api = details.api
    this.traceId = details.traceId
    this.body = details.body
  }
}

const BODY_SNIPPET_MAX = 300

/** Trunca o corpo para armazenamento/log seguro. */
export function truncateBody(body: string | undefined): string | undefined {
  if (!body) return undefined
  return body.length > BODY_SNIPPET_MAX ? body.slice(0, BODY_SNIPPET_MAX) : body
}

/**
 * Mapeia status HTTP + corpo para um `code`. O sniff de "not the owner" /
 * "device_offline" vive aqui (o Connector Proxy devolve 403 com essas strings),
 * normalizando o motivo na origem em vez de na camada de UI.
 */
export function mapHttpStatusToCode(status: number, bodyText: string): ControllerErrorCode {
  const b = (bodyText || '').toLowerCase()
  if (b.includes('not the owner') || b.includes('owner of this host')) return 'NOT_OWNER'
  if (b.includes('device_offline')) return 'DEVICE_OFFLINE'
  switch (status) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 429:
      return 'RATE_LIMITED'
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN'
  }
}

/**
 * Mapeia uma rejeição do `fetch` (sem `response`) para `TIMEOUT` ou `NETWORK`.
 * O undici (fetch do Node) expõe o código libuv em `error.cause.code`.
 */
export function mapFetchNetworkErrorToCode(error: unknown): ControllerErrorCode {
  // AbortSignal.timeout() rejeita com um DOMException 'TimeoutError'.
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'TIMEOUT'
  }
  const cause = (error as { cause?: { code?: string } } | undefined)?.cause
  const causeCode = cause?.code
  const NETWORK_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH']
  if (causeCode && NETWORK_CODES.includes(causeCode)) return 'NETWORK'

  const msg = error instanceof Error ? error.message : String(error)
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|getaddrinfo|network|fetch failed/i.test(msg)) {
    return 'NETWORK'
  }
  return 'UNKNOWN'
}

/**
 * Extrai `traceId` de um corpo de erro (JSON da Ubiquiti) e/ou dos headers.
 * Best-effort: retorna `undefined` se nada for encontrado.
 */
export function extractTraceId(bodyText: string | undefined, headers?: Headers): string | undefined {
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as { traceId?: string; trace_id?: string }
      if (parsed?.traceId) return parsed.traceId
      if (parsed?.trace_id) return parsed.trace_id
    } catch {
      // corpo não-JSON — ignora
    }
  }
  if (headers) {
    return headers.get('x-trace-id') || headers.get('traceid') || headers.get('trace-id') || undefined
  }
  return undefined
}
