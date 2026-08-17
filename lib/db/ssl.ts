import type { PoolConfig } from 'pg'

/**
 * Resolve a configuração de SSL para a conexão com o PostgreSQL.
 *
 * Comportamento neutro a fornecedor — funciona tanto num Postgres padrão
 * self-hosted (normalmente sem TLS) quanto num gerenciado (que exige TLS,
 * frequentemente com certificado auto-assinado).
 *
 * Controle via env `DATABASE_SSL`:
 *   - false | disable | 0        → sem TLS (caso típico do Postgres local)
 *   - require | no-verify        → TLS sem validar o certificado (gerenciado/auto-assinado)
 *   - true | verify              → TLS validando a CA
 *
 * Sem `DATABASE_SSL`, o modo é inferido do `DATABASE_URL`: se a URL contém
 * `sslmode=require`/`verify`, usa TLS sem validar a CA; caso contrário, sem TLS.
 */
export function resolveSsl(): PoolConfig['ssl'] {
  const mode = (process.env.DATABASE_SSL || '').trim().toLowerCase()

  switch (mode) {
    case 'false':
    case 'disable':
    case '0':
    case 'off':
      return false
    case 'require':
    case 'no-verify':
      return { rejectUnauthorized: false }
    case 'true':
    case 'verify':
      return { rejectUnauthorized: true }
  }

  // Sem override explícito: inferir da connection string.
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
  if (/sslmode=(require|verify)/i.test(url)) {
    return { rejectUnauthorized: false }
  }

  return false
}
