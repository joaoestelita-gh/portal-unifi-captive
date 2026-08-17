'use server'

/**
 * Server Actions — WiFi Users
 *
 * Gerenciamento de usuários WiFi: registro, CRUD admin,
 * dispositivos e configurações de confiança.
 */

import { db } from '@/lib/db'
import { wifiUsers, wifiSessions, wifiUserDevices } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { hashPassword } from '@/lib/crypto'
import { registerWifiUserSchema } from '@/lib/validations'
import { calculateTrustExpiry, MAX_DEVICES_PER_USER, DEFAULT_SPEED_UP_KBPS, DEFAULT_SPEED_DOWN_KBPS } from '@/lib/constants'
import { ControllerService } from '@/lib/controllers'
import { findPreauthorizedByMac, markPreauthLinked } from '@/lib/preauth'
import { getPortalSettings } from './portal-settings'

// ============================================================================
// DEVICE REGISTRATION (internal helper)
// ============================================================================

/**
 * Registra ou atualiza um dispositivo para um usuário (máx 3 por usuário).
 * Remove o mais antigo se exceder o limite.
 */
export async function registerDevice(
  wifiUserId: string,
  macAddress: string
): Promise<{ success: boolean; error?: string }> {
  if (!macAddress) return { success: true }

  // Verificar se MAC já está registrado para este usuário
  const existing = await db.select().from(wifiUserDevices)
    .where(and(
      eq(wifiUserDevices.wifiUserId, wifiUserId),
      eq(wifiUserDevices.macAddress, macAddress)
    ))
    .limit(1)

  if (existing.length > 0) {
    await db.update(wifiUserDevices).set({ lastSeen: new Date() })
      .where(eq(wifiUserDevices.id, existing[0].id))
    return { success: true }
  }

  // Verificar limite de dispositivos
  const deviceCount = await db.select().from(wifiUserDevices)
    .where(eq(wifiUserDevices.wifiUserId, wifiUserId))

  if (deviceCount.length >= MAX_DEVICES_PER_USER) {
    const oldest = deviceCount.sort((a, b) =>
      new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime()
    )[0]
    await db.delete(wifiUserDevices).where(eq(wifiUserDevices.id, oldest.id))
  }

  // Registrar novo dispositivo
  await db.insert(wifiUserDevices).values({
    id: nanoid(),
    wifiUserId,
    macAddress,
    deviceName: null,
    trusted: false,
    trustedUntil: null,
    lastSeen: new Date(),
    createdAt: new Date(),
  })

  // Manter macAddress no wifiUsers atualizado (backwards compat)
  await db.update(wifiUsers).set({ macAddress, updatedAt: new Date() })
    .where(eq(wifiUsers.id, wifiUserId))

  return { success: true }
}

// ============================================================================
// USER REGISTRATION
// ============================================================================

/**
 * Registra um novo usuário WiFi (auto-cadastro via portal).
 */
export async function registerWifiUser(data: {
  name: string
  email: string
  phone?: string
  password: string
  macAddress?: string
}) {
  const parsed = registerWifiUserSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const settings = await getPortalSettings()
  const hashedPw = await hashPassword(parsed.data.password)

  const existingUser = await db.select().from(wifiUsers).where(eq(wifiUsers.email, parsed.data.email))
  if (existingUser.length > 0) {
    return { success: false, error: 'Email já cadastrado' }
  }

  // MAC pré-autorizado → aprova automaticamente (ignora requireApproval).
  const preauth = await findPreauthorizedByMac(data.macAddress)
  const requiresApproval = preauth ? false : !!settings.requireApproval

  const newUser = {
    id: nanoid(),
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    password: hashedPw,
    macAddress: data.macAddress || null,
    status: requiresApproval ? 'pending' : 'approved',
    dailyLimitMinutes: settings.defaultDailyMinutes,
    sessionLimitMinutes: settings.defaultSessionMinutes,
    speedLimitDown: settings.defaultSpeedDown,
    speedLimitUp: settings.defaultSpeedUp,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(wifiUsers).values(newUser)

  // Vincula a entrada pré-autorizada ao novo usuário e registra o dispositivo.
  if (preauth) {
    await markPreauthLinked(preauth, newUser.id)
    if (data.macAddress) {
      await registerDevice(newUser.id, data.macAddress)
    }
  }

  return {
    success: true,
    requiresApproval,
    userId: newUser.id,
  }
}

// ============================================================================
// ADMIN: USER CRUD
// ============================================================================

/** Lista todos os usuários WiFi. */
export async function getWifiUsers() {
  return db.select().from(wifiUsers).orderBy(desc(wifiUsers.createdAt))
}

/** Lista usuários pendentes de aprovação. */
export async function getPendingUsers() {
  return db.select().from(wifiUsers)
    .where(eq(wifiUsers.status, 'pending'))
    .orderBy(desc(wifiUsers.createdAt))
}

/** Aprova um usuário pendente. */
export async function approveUser(userId: string) {
  await db.update(wifiUsers).set({
    status: 'approved',
    updatedAt: new Date(),
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

/** Bloqueia um usuário e desautoriza na controladora. */
export async function blockUser(userId: string) {
  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId))
  if (users.length > 0 && users[0].macAddress) {
    const settings = await getPortalSettings()
    await ControllerService.deauthorizeGuest(settings, { macAddress: users[0].macAddress })
  }

  await db.update(wifiUsers).set({
    status: 'blocked',
    updatedAt: new Date(),
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

/** Exclui um usuário e suas sessões. */
export async function deleteWifiUser(userId: string) {
  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId))
  if (users.length > 0 && users[0].macAddress) {
    const settings = await getPortalSettings()
    await ControllerService.deauthorizeGuest(settings, { macAddress: users[0].macAddress })
  }

  await db.delete(wifiUserDevices).where(eq(wifiUserDevices.wifiUserId, userId))
  await db.delete(wifiSessions).where(eq(wifiSessions.wifiUserId, userId))
  await db.delete(wifiUsers).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

/** Cria um usuário WiFi via admin (já aprovado). */
export async function createWifiUserByAdmin(data: {
  name: string
  email: string
  phone?: string
  password: string
  macAddress?: string
  dailyLimitMinutes?: number
  sessionLimitMinutes?: number
  speedLimitDown?: number
  speedLimitUp?: number
}) {
  const settings = await getPortalSettings()
  const hashedPw = await hashPassword(data.password)

  const existingUser = await db.select().from(wifiUsers).where(eq(wifiUsers.email, data.email))
  if (existingUser.length > 0) {
    return { success: false, error: 'Email ja cadastrado' }
  }

  const newUser = {
    id: nanoid(),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    password: hashedPw,
    macAddress: data.macAddress || null,
    status: 'approved',
    dailyLimitMinutes: data.dailyLimitMinutes || settings.defaultDailyMinutes,
    sessionLimitMinutes: data.sessionLimitMinutes || settings.defaultSessionMinutes,
    speedLimitDown: data.speedLimitDown || settings.defaultSpeedDown,
    speedLimitUp: data.speedLimitUp || settings.defaultSpeedUp,
    totalTimeUsedToday: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(wifiUsers).values(newUser)
  revalidatePath('/admin')

  return {
    success: true,
    userId: newUser.id,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  }
}

/** Atualiza dados de um usuário WiFi. */
export async function updateWifiUser(userId: string, data: {
  name?: string
  email?: string
  phone?: string
  password?: string
  macAddress?: string
  dailyLimitMinutes?: number
  sessionLimitMinutes?: number
  speedLimitDown?: number
  speedLimitUp?: number
  status?: string
}) {
  const updateData: Partial<typeof wifiUsers.$inferInsert> = { updatedAt: new Date() }

  if (data.name) updateData.name = data.name
  if (data.email) updateData.email = data.email
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.macAddress !== undefined) updateData.macAddress = data.macAddress
  if (data.dailyLimitMinutes !== undefined) updateData.dailyLimitMinutes = data.dailyLimitMinutes
  if (data.sessionLimitMinutes !== undefined) updateData.sessionLimitMinutes = data.sessionLimitMinutes
  if (data.speedLimitDown !== undefined) updateData.speedLimitDown = data.speedLimitDown
  if (data.speedLimitUp !== undefined) updateData.speedLimitUp = data.speedLimitUp
  if (data.status) updateData.status = data.status

  if (data.password) {
    updateData.password = await hashPassword(data.password)
  }

  await db.update(wifiUsers).set(updateData).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')

  return { success: true }
}

/** Atualiza limites de um usuário. */
export async function updateUserLimits(userId: string, limits: {
  dailyLimitMinutes?: number
  sessionLimitMinutes?: number
  speedLimitDown?: number
  speedLimitUp?: number
}) {
  await db.update(wifiUsers).set({
    ...limits,
    updatedAt: new Date(),
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

// ============================================================================
// DEVICE TRUST MANAGEMENT
// ============================================================================

/** Define dispositivo confiável (auto-reconnect sem login). */
export async function setTrustedDevice(userId: string, duration: string) {
  const trustedUntil = calculateTrustExpiry(duration)

  await db.update(wifiUsers).set({
    trusted: true,
    trustedUntil,
    updatedAt: new Date(),
  }).where(eq(wifiUsers.id, userId))

  revalidatePath('/admin')
  return { success: true }
}

/** Remove status de confiança do usuário. */
export async function removeTrustedDevice(userId: string) {
  await db.update(wifiUsers).set({
    trusted: false,
    trustedUntil: null,
    updatedAt: new Date(),
  }).where(eq(wifiUsers.id, userId))

  revalidatePath('/admin')
  return { success: true }
}

/** Busca dispositivos de um usuário. */
export async function getUserDevices(userId: string) {
  return db.select().from(wifiUserDevices)
    .where(eq(wifiUserDevices.wifiUserId, userId))
    .orderBy(desc(wifiUserDevices.lastSeen))
}

/** Define confiança em um dispositivo específico. */
export async function setDeviceTrusted(deviceId: string, duration: string) {
  const trustedUntil = calculateTrustExpiry(duration)

  await db.update(wifiUserDevices).set({
    trusted: true,
    trustedUntil,
  }).where(eq(wifiUserDevices.id, deviceId))

  revalidatePath('/admin')
  return { success: true }
}

/** Remove confiança de um dispositivo específico. */
export async function removeDeviceTrust(deviceId: string) {
  await db.update(wifiUserDevices).set({
    trusted: false,
    trustedUntil: null,
  }).where(eq(wifiUserDevices.id, deviceId))

  revalidatePath('/admin')
  return { success: true }
}

/** Renomeia um dispositivo. */
export async function renameDevice(deviceId: string, deviceName: string) {
  await db.update(wifiUserDevices).set({
    deviceName: deviceName || null,
  }).where(eq(wifiUserDevices.id, deviceId))

  revalidatePath('/admin')
  return { success: true }
}

/** Remove um dispositivo. */
export async function removeDevice(deviceId: string) {
  await db.delete(wifiUserDevices).where(eq(wifiUserDevices.id, deviceId))

  revalidatePath('/admin')
  return { success: true }
}
