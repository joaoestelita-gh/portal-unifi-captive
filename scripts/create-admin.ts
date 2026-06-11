import { db } from '@/lib/db'
import { user, account } from '@/lib/db/schema'
import { nanoid } from 'nanoid'

// Run this to create the first admin user
// Usage: npx tsx scripts/create-admin.ts

async function createAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const adminName = process.env.ADMIN_NAME || 'Administrador'

  // Hash password
  const encoder = new TextEncoder()
  const data = encoder.encode(adminPassword + process.env.BETTER_AUTH_SECRET)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashedPassword = Buffer.from(hash).toString('hex')

  const userId = nanoid()

  try {
    // Create user
    await db.insert(user).values({
      id: userId,
      name: adminName,
      email: adminEmail,
      emailVerified: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create account with password
    await db.insert(account).values({
      id: nanoid(),
      accountId: userId,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('Admin user created successfully!')
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
  } catch (error) {
    console.error('Error creating admin:', error)
  }

  process.exit(0)
}

createAdmin()
