import { createUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

/**
 * Endpoint de setup inicial do portal.
 * PROTEGIDO: só permite criação de admin quando:
 * 1. Não existe nenhum admin no sistema (first-time setup), OU
 * 2. O header Authorization contém o CRON_SECRET correto
 *
 * Nunca retorna credenciais na resposta.
 */
export async function GET(request: Request) {
  try {
    // Verificar se já existem admins no sistema
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1)

    // Se já existem admins, exigir autenticação via secret
    if (existingAdmins.length > 0) {
      const authHeader = request.headers.get('authorization')
      const setupSecret = process.env.CRON_SECRET

      if (!setupSecret || authHeader !== `Bearer ${setupSecret}`) {
        return NextResponse.json(
          { success: false, error: 'Setup já realizado. Faça login em /admin/login' },
          { status: 403 }
        )
      }
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'admin@exemplo.com'
    const password = searchParams.get('password') || 'admin123'
    const name = searchParams.get('name') || 'Administrador'

    // Verificar se o email já está em uso
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Usuário já existe. Faça login em /admin/login',
      })
    }

    // Criar usuário admin
    await createUser({
      email,
      password,
      name,
      role: 'admin',
    })

    return NextResponse.json({
      success: true,
      message: 'Admin criado com sucesso!',
      nextStep: 'Acesse /admin/login para fazer login',
    })
  } catch (error) {
    console.error('Erro ao criar admin:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao criar admin' },
      { status: 500 }
    )
  }
}
