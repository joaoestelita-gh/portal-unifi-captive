import { Client } from 'pg'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.error('[dump] DATABASE_URL/POSTGRES_URL não encontrada no ambiente')
  process.exit(1)
}

// SSL neutro a fornecedor (mesma lógica de lib/db/ssl.ts, replicada porque
// este arquivo é .mjs puro e não importa TypeScript).
function resolveSsl() {
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
  if (/sslmode=(require|verify)/i.test(connectionString)) {
    return { rejectUnauthorized: false }
  }
  return false
}

const client = new Client({ connectionString, ssl: resolveSsl() })

// Escapa um valor para uso literal em SQL
function quoteLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (value instanceof Date) return `'${value.toISOString()}'`
  if (Buffer.isBuffer(value)) return `'\\x${value.toString('hex')}'`
  if (typeof value === 'object') {
    // json/jsonb/arrays
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }
  return `'${String(value).replace(/'/g, "''")}'`
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`
}

async function main() {
  await client.connect()

  const lines = []
  lines.push('--')
  lines.push('-- Dump do banco de dados (portal-unifi-captive)')
  lines.push(`-- Gerado em: ${new Date().toISOString()}`)
  lines.push('--')
  lines.push('')
  lines.push('SET client_encoding = ' + "'UTF8'" + ';')
  lines.push('SET standard_conforming_strings = on;')
  lines.push('')

  // Tabelas do schema public
  const { rows: tables } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  console.log(`[dump] ${tables.length} tabela(s) encontrada(s)`)

  // ---- DDL: CREATE TABLE ----
  for (const { table_name } of tables) {
    const { rows: cols } = await client.query(
      `
      SELECT column_name, data_type, udt_name, character_maximum_length,
             numeric_precision, numeric_scale, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
      [table_name]
    )

    const colDefs = cols.map((c) => {
      let type
      switch (c.data_type) {
        case 'character varying':
          type = c.character_maximum_length
            ? `varchar(${c.character_maximum_length})`
            : 'varchar'
          break
        case 'character':
          type = c.character_maximum_length
            ? `char(${c.character_maximum_length})`
            : 'char'
          break
        case 'numeric':
          type =
            c.numeric_precision != null
              ? `numeric(${c.numeric_precision}${c.numeric_scale != null ? `,${c.numeric_scale}` : ''})`
              : 'numeric'
          break
        case 'ARRAY':
          type = `${c.udt_name.replace(/^_/, '')}[]`
          break
        case 'USER-DEFINED':
          type = c.udt_name
          break
        default:
          type = c.data_type
      }

      let def = `  ${quoteIdent(c.column_name)} ${type}`
      if (c.column_default) def += ` DEFAULT ${c.column_default}`
      if (c.is_nullable === 'NO') def += ' NOT NULL'
      return def
    })

    lines.push(`DROP TABLE IF EXISTS ${quoteIdent(table_name)} CASCADE;`)
    lines.push(`CREATE TABLE ${quoteIdent(table_name)} (`)
    lines.push(colDefs.join(',\n'))
    lines.push(');')
    lines.push('')
  }

  // ---- Constraints (PK, UNIQUE, FK) ----
  for (const { table_name } of tables) {
    const { rows: constraints } = await client.query(
      `
      SELECT conname,
             pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = $1
      ORDER BY c.contype DESC, conname
    `,
      [table_name]
    )
    for (const con of constraints) {
      lines.push(
        `ALTER TABLE ${quoteIdent(table_name)} ADD CONSTRAINT ${quoteIdent(con.conname)} ${con.def};`
      )
    }
  }
  lines.push('')

  // ---- Índices (que não são de constraints) ----
  for (const { table_name } of tables) {
    const { rows: indexes } = await client.query(
      `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
        AND indexname NOT IN (
          SELECT conname FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = $1
        )
      ORDER BY indexname
    `,
      [table_name]
    )
    for (const idx of indexes) {
      lines.push(`${idx.indexdef};`)
    }
  }
  lines.push('')

  // ---- Dados (INSERT) ----
  let totalRows = 0
  for (const { table_name } of tables) {
    const { rows } = await client.query(
      `SELECT * FROM ${quoteIdent(table_name)}`
    )
    if (rows.length === 0) continue

    const columns = Object.keys(rows[0])
    const colList = columns.map(quoteIdent).join(', ')

    lines.push(`-- Dados: ${table_name} (${rows.length} linha(s))`)
    for (const row of rows) {
      const values = columns.map((col) => quoteLiteral(row[col])).join(', ')
      lines.push(
        `INSERT INTO ${quoteIdent(table_name)} (${colList}) VALUES (${values});`
      )
    }
    lines.push('')
    totalRows += rows.length
  }

  // ---- Sequências ----
  const { rows: sequences } = await client.query(`
    SELECT sequence_name FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  `)
  for (const { sequence_name } of sequences) {
    const { rows } = await client.query(
      `SELECT last_value, is_called FROM ${quoteIdent(sequence_name)}`
    )
    if (rows.length) {
      lines.push(
        `SELECT setval('${sequence_name}', ${rows[0].last_value}, ${rows[0].is_called});`
      )
    }
  }
  lines.push('')

  const sql = lines.join('\n')
  const outPath = 'public/db-dump.sql'
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, sql, 'utf8')

  console.log(
    `[dump] Gerado ${outPath} — ${tables.length} tabela(s), ${totalRows} linha(s), ${sql.length} bytes`
  )

  await client.end()
}

main().catch((err) => {
  console.error('[dump] Erro:', err)
  process.exit(1)
})
