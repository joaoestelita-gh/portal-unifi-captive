import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

// Run this to create the first admin user
// Usage: npx tsx scripts/create-admin.ts

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'Administrador'

  // Hash password with bcrypt (same as lib/auth.ts)
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const userId = nanoid()

  try {
    // Check if admin already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1)

    if (existing.length > 0) {
      console.log('Admin já existe com este email. Nenhuma ação necessária.')
      process.exit(0)
    }

    // Create user with admin role
    await db.insert(users).values({
      id: userId,
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('Admin criado com sucesso!')
    console.log(`Email: ${adminEmail}`)
    console.log(`Senha: ${adminPassword}`)
    console.log('\nAcesse /admin/login para fazer login.')
  } catch (error) {
    console.error('Erro ao criar admin:', error)
  }

  process.exit(0)
}

createAdmin()
