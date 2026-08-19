import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'
import { hashPassword, verifyPassword } from '@/lib/crypto'

// Re-export para manter compatibilidade com imports existentes
export { hashPassword, verifyPassword }

const SESSION_COOKIE_NAME = 'session_token'
const SESSION_EXPIRY_DAYS = 7

export async function createUser(data: {
  email: string
  password: string
  name: string
  role?: string
}) {
  const id = nanoid()
  const hashedPassword = await hashPassword(data.password)
  
  await db.insert(users).values({
    id,
    email: data.email,
    name: data.name,
    password: hashedPassword,
    role: data.role || 'user',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  return { id, email: data.email, name: data.name, role: data.role || 'user' }
}

export async function createSession(userId: string) {
  const token = nanoid(32)
  const id = nanoid()
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  
  await db.insert(sessions).values({
    id,
    token,
    userId,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: expiresAt,
    path: '/',
  })
  
  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) return null
  
  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1)
  
  if (result.length === 0) return null
  
  return {
    user: {
      id: result[0].user.id,
      email: result[0].user.email,
      name: result[0].user.name,
      role: result[0].user.role,
    },
    session: result[0].session,
  }
}

// Mensagem única para qualquer falha de autenticação: não revela se o e-mail
// existe (evita user enumeration).
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos'

// Hash "dummy" usado para equalizar o tempo de resposta quando o e-mail não
// existe (evita distinguir "usuário inexistente" por timing).
let dummyHashPromise: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('invalid-placeholder-password')
  }
  return dummyHashPromise
}

export async function signIn(email: string, password: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  const user = result[0]

  if (!user || !user.password) {
    // Gasta o mesmo tempo de um bcrypt.compare real e responde genericamente.
    await verifyPassword(password, await getDummyHash())
    throw new Error(INVALID_CREDENTIALS_MESSAGE)
  }

  const valid = await verifyPassword(password, user.password)

  if (!valid) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE)
  }

  await createSession(user.id)

  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export async function signOut() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
    cookieStore.delete(SESSION_COOKIE_NAME)
  }
}

export async function requireAdmin() {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Não autenticado')
  }
  
  if (session.user.role !== 'admin') {
    throw new Error('Acesso negado')
  }
  
  return session.user
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  
  if (result.length === 0) {
    throw new Error('Usuário não encontrado')
  }
  
  const user = result[0]
  
  if (!user.password) {
    throw new Error('Senha não configurada')
  }
  
  const valid = await verifyPassword(currentPassword, user.password)
  
  if (!valid) {
    throw new Error('Senha atual incorreta')
  }
  
  const hashedPassword = await hashPassword(newPassword)
  
  await db.update(users)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, userId))
  
  return true
}

export async function getAllAdmins() {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'admin'))
  
  return result
}

export async function deleteAdmin(adminId: string, currentUserId: string) {
  if (adminId === currentUserId) {
    throw new Error('Você não pode excluir sua própria conta')
  }
  
  await db.delete(sessions).where(eq(sessions.userId, adminId))
  await db.delete(users).where(and(eq(users.id, adminId), eq(users.role, 'admin')))
  
  return true
}

export async function updateAdmin(adminId: string, data: {
  name?: string
  email?: string
  password?: string
}) {
  const updateData: Partial<{ name: string; email: string; password: string; updatedAt: Date }> = { updatedAt: new Date() }
  
  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.password) {
    updateData.password = await hashPassword(data.password)
  }

  await db.update(users)
    .set(updateData)
    .where(and(eq(users.id, adminId), eq(users.role, 'admin')))
  
  return true
}
