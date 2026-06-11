import { createUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || 'admin@exemplo.com'
  const password = searchParams.get('password') || 'admin123'
  const name = searchParams.get('name') || 'Administrador'

  try {
    // Verifica se já existe
    const existing = await db.select().from(users).where(eq(users.email, email))

    if (existing.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Usuário já existe. Faça login em /admin/login' 
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
      message: `Admin criado com sucesso!`,
      credentials: { email, password },
      nextStep: 'Acesse /admin/login para fazer login'
    })
  } catch (error) {
    console.error('Erro ao criar admin:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}
