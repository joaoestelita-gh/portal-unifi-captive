/**
 * CLI para criar um novo usuário administrador.
 *
 * Uso:
 *   npm run create-admin                       # modo interativo (pergunta os dados)
 *   npm run create-admin -- --email a@b.com --password Senha123 --name "Fulano"
 *   ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=Senha123 npm run create-admin  # via env
 *
 * Flags:
 *   --email     E-mail do admin (obrigatório)
 *   --password  Senha (mín. 8 caracteres). Se omitida, é solicitada de forma oculta.
 *   --name      Nome de exibição (padrão: "Administrador")
 *   --role      Papel (padrão: "admin")
 *   --force     Se o e-mail já existir, promove/atualiza o usuário para admin.
 *   --yes       Não pede confirmação.
 *
 * Este script usa bcrypt e a tabela `users` — igual ao login em lib/auth.ts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as readline from 'node:readline'
import { Writable } from 'node:stream'

// --- 1. Carrega variáveis de ambiente (.env.local depois .env) -------------
// Um dotenv minimalista para não depender da versão do Node nem de deps extras.
function loadEnvFile(file: string) {
  let content: string
  try {
    content = readFileSync(resolve(process.cwd(), file), 'utf8')
  } catch {
    return // arquivo não existe — ignora
  }
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key] !== undefined) continue // não sobrescreve o que já existe
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida. Configure o .env.local antes de rodar.')
  process.exit(1)
}

// --- 2. Parsing de argumentos ----------------------------------------------
function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key] = true // flag booleana
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

// --- 3. Prompts interativos ------------------------------------------------
function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const suffix = defaultValue ? ` (${defaultValue})` : ''
  return new Promise((res) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close()
      res(answer.trim() || defaultValue || '')
    })
  })
}

// Leitura de senha sem eco no terminal.
function promptPassword(question: string): Promise<string> {
  return new Promise((res) => {
    const muted = new Writable({
      write(_chunk, _enc, cb) {
        cb()
      },
    })
    const rl = readline.createInterface({ input: process.stdin, output: muted, terminal: true })
    process.stdout.write(`${question}: `)
    rl.question('', (answer) => {
      rl.close()
      process.stdout.write('\n')
      res(answer.trim())
    })
  })
}

// --- 4. Validações ---------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function main() {
  // Imports que dependem de DATABASE_URL devem vir DEPOIS do load acima.
  // (imports estáticos são içados, então usamos import dinâmico dentro de main)
  const { db } = await import('../lib/db')
  const { users } = await import('../lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const bcrypt = (await import('bcryptjs')).default
  const { nanoid } = await import('nanoid')

  // e-mail
  let email = (args.email as string) || process.env.ADMIN_EMAIL || ''
  if (!email) email = await prompt('E-mail do admin')
  email = email.toLowerCase()
  if (!isValidEmail(email)) {
    console.error(`❌ E-mail inválido: "${email}"`)
    process.exit(1)
  }

  // nome
  let name = (args.name as string) || process.env.ADMIN_NAME || ''
  if (!name && !args.yes) name = await prompt('Nome de exibição', 'Administrador')
  name = name || 'Administrador'

  // role
  const role = (args.role as string) || 'admin'

  // senha
  let password = (args.password as string) || process.env.ADMIN_PASSWORD || ''
  if (!password) {
    password = await promptPassword('Senha (mín. 8 caracteres)')
    const confirm = await promptPassword('Confirme a senha')
    if (password !== confirm) {
      console.error('❌ As senhas não conferem.')
      process.exit(1)
    }
  }
  if (password.length < 8) {
    console.error('❌ A senha deve ter pelo menos 8 caracteres.')
    process.exit(1)
  }

  // --- 5. Verifica e-mail existente ----------------------------------------
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing.length > 0) {
    const current = existing[0]
    if (!args.force) {
      console.error(
        `❌ Já existe um usuário com o e-mail "${email}" (role: ${current.role}).\n` +
          '   Use --force para atualizar a senha e promover a admin.',
      )
      process.exit(1)
    }
    const hashed = await bcrypt.hash(password, 10)
    await db
      .update(users)
      .set({ name, role, password: hashed, updatedAt: new Date() })
      .where(eq(users.id, current.id))
    console.log(`✅ Usuário "${email}" atualizado (role: ${role}).`)
    process.exit(0)
  }

  // --- 6. Confirmação ------------------------------------------------------
  if (!args.yes) {
    console.log('\nCriar novo administrador:')
    console.log(`  Nome:  ${name}`)
    console.log(`  Email: ${email}`)
    console.log(`  Role:  ${role}`)
    const ok = await prompt('Confirmar? (s/N)')
    if (ok.toLowerCase() !== 's' && ok.toLowerCase() !== 'sim') {
      console.log('Cancelado.')
      process.exit(0)
    }
  }

  // --- 7. Cria o usuário ---------------------------------------------------
  const id = nanoid()
  const hashed = await bcrypt.hash(password, 10)
  await db.insert(users).values({
    id,
    name,
    email,
    password: hashed,
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log('\n✅ Administrador criado com sucesso!')
  console.log(`  Email: ${email}`)
  console.log(`  Role:  ${role}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Erro ao criar admin:', err instanceof Error ? err.message : err)
  process.exit(1)
})
