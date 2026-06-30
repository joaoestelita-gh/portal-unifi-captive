// Gera um dump SQL completo do banco (schema public): estrutura + dados.
// Uso: node --env-file-if-exists=/vercel/share/.env.project scripts/db-dump.mjs
import pg from 'pg'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const { Client } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('[v0] DATABASE_URL nao definida')
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

// Formata um valor JS para um literal SQL seguro.
function toSqlLiteral(value, dataType) {
  if (value === null || value === undefined) return 'NULL'

  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  if (Array.isArray(value)) {
    // Arrays do Postgres
    const inner = value.map((v) => (v === null ? 'NULL' : String(v).replace(/"/g, '\\"'))).join(',')
    return `'{${inner}}'`
  }

  if (typeof value === 'object') {
    // jsonb / json
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }

  // string e demais: escapa aspas simples
  return `'${String(value).replace(/'/g, "''")}'`
}

async function main() {
  await client.connect()
  console.log('[v0] Conectado ao banco')

  // 1) Lista as tabelas do schema public
  const { rows: tables } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `)

  const lines = []
  const now = new Date().toISOString()
  lines.push('-- ============================================')
  lines.push('-- Dump SQL do banco (schema public)')
  lines.push(`-- Gerado em: ${now}`)
  lines.push(`-- Tabelas: ${tables.map((t) => t.tablename).join(', ')}`)
  lines.push('-- ============================================')
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')

  for (const { tablename } of tables) {
    // 2) Colunas + tipos + defaults + nullability
    const { rows: cols } = await client.query(
      `
      SELECT column_name, data_type, udt_name, is_nullable, column_default,
             character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `,
      [tablename]
    )

    // 3) Primary key
    const { rows: pkRows } = await client.query(
      `
      SELECT a.attname AS column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = ('public.' || quote_ident($1))::regclass AND i.indisprimary;
    `,
      [tablename]
    )
    const pkCols = pkRows.map((r) => r.column_name)

    lines.push(`-- ---------- Tabela: ${tablename} ----------`)
    lines.push(`DROP TABLE IF EXISTS "${tablename}" CASCADE;`)

    const colDefs = cols.map((c) => {
      let type = c.data_type
      if (type === 'character varying') type = c.character_maximum_length ? `varchar(${c.character_maximum_length})` : 'varchar'
      else if (type === 'USER-DEFINED') type = c.udt_name
      else if (type === 'ARRAY') type = `${c.udt_name.replace(/^_/, '')}[]`
      else if (type === 'timestamp without time zone') type = 'timestamp'
      else if (type === 'timestamp with time zone') type = 'timestamptz'

      let def = `  "${c.column_name}" ${type}`
      if (c.column_default) def += ` DEFAULT ${c.column_default}`
      if (c.is_nullable === 'NO') def += ' NOT NULL'
      return def
    })

    if (pkCols.length) {
      colDefs.push(`  PRIMARY KEY (${pkCols.map((c) => `"${c}"`).join(', ')})`)
    }

    lines.push(`CREATE TABLE "${tablename}" (`)
    lines.push(colDefs.join(',\n'))
    lines.push(');')
    lines.push('')

    // 4) Dados
    const { rows: data } = await client.query(`SELECT * FROM "${tablename}";`)
    if (data.length) {
      const colNames = cols.map((c) => c.column_name)
      lines.push(`-- Dados de ${tablename} (${data.length} linha(s))`)
      for (const row of data) {
        const values = colNames.map((name) => toSqlLiteral(row[name]))
        lines.push(
          `INSERT INTO "${tablename}" (${colNames.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`
        )
      }
      lines.push('')
    } else {
      lines.push(`-- (sem dados em ${tablename})`)
      lines.push('')
    }
  }

  lines.push('COMMIT;')
  lines.push('')

  const outPath = '/vercel/share/v0-project/public/backup.sql'
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, lines.join('\n'), 'utf8')
  console.log(`[v0] Dump gerado em ${outPath}`)

  await client.end()
}

main().catch((err) => {
  console.error('[v0] Erro ao gerar dump:', err)
  process.exit(1)
})
