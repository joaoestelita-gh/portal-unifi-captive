/**
 * Logger leve com níveis e prefixo — substitui `console.*` avulso.
 *
 * - Níveis: debug < info < warn < error. Filtra por `LOG_LEVEL` (env), com
 *   default `info` em produção e `debug` fora dela.
 * - Não conhece banco de dados: a persistência de logs de API (ex.: UniFi Cloud)
 *   é responsabilidade de `lib/cloud-api-logs.ts`. Este utilitário é síncrono e
 *   seguro de chamar em qualquer lugar.
 *
 * SEGREDOS: `meta` deve conter apenas valores primitivos NÃO sensíveis. Nunca
 * passe `config.credentials`, headers ou a API key — nada disso deve chegar aqui.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function resolveMinLevel(): LogLevel {
  const fromEnv = (process.env.LOG_LEVEL || '').toLowerCase()
  if (fromEnv === 'debug' || fromEnv === 'info' || fromEnv === 'warn' || fromEnv === 'error') {
    return fromEnv
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

const MIN_LEVEL = resolveMinLevel()

export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

export function createLogger(prefix: string): Logger {
  const emit = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    if (ORDER[level] < ORDER[MIN_LEVEL]) return
    const line = `[${prefix}] ${msg}`
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    if (meta && Object.keys(meta).length > 0) {
      fn(line, meta)
    } else {
      fn(line)
    }
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
  }
}
