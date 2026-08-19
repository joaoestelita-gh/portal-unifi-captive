'use server'

/**
 * Server Actions — WiFi Sessions
 *
 * Login de usuários e vouchers, verificação de sessão ativa,
 * gerenciamento de sessões (admin).
 */

import { db } from '@/lib/db'
import { wifiUsers, wifiSessions, wifiVouchers, wifiUserDevices } from '@/lib/db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { verifyPassword } from '@/lib/crypto'
import { loginWifiUserSchema, loginVoucherSchema } from '@/lib/validations'
import { createRadiusToken } from '@/lib/radius'
import { findPreauthorizedByMac, markPreauthLinked } from '@/lib/preauth'
import { ControllerService } from '@/lib/controllers'
import { DEFAULT_SPEED_UP_KBPS, DEFAULT_SPEED_DOWN_KBPS, DEFAULT_SESSION_MINUTES, DEFAULT_DAILY_MINUTES, DEFAULT_SUCCESS_REDIRECT_URL } from '@/lib/constants'
import { getPortalSettings } from './portal-settings'
import { registerDevice } from './wifi-users'
import type { ArubaRedirectParams } from '@/lib/controllers/adapters/aruba.adapter'
import type { SessionMeta } from '@/lib/types/portal'

// ============================================================================
// SESSION CHECK (auto-reconnect / trusted devices)
// ============================================================================

/**
 * Verifica se o MAC tem sessão ativa e auto-reconecta.
 * Também trata dispositivos confiáveis: se o MAC pertence a um usuário
 * trusted, cria sessão automaticamente sem login.
 */
export async function checkActiveSession(
  macAddress: string,
  detectedController?: string | null,
  arubaParams?: ArubaRedirectParams
) {
  if (!macAddress) {
    return { hasActiveSession: false }
  }

  const settings = await getPortalSettings()

  // 1. Verificar sessão ativa existente para este MAC
  const activeSessions = await db.select({
    session: wifiSessions,
    user: wifiUsers,
  })
    .from(wifiSessions)
    .leftJoin(wifiUsers, eq(wifiSessions.wifiUserId, wifiUsers.id))
    .where(
      and(
        eq(wifiSessions.macAddress, macAddress),
        eq(wifiSessions.status, 'active')
      )
    )
    .orderBy(desc(wifiSessions.startTime))
    .limit(1)

  if (activeSessions.length > 0) {
    const { session, user } = activeSessions[0]

    // Verificar se sessão expirou
    if (session.expectedEndTime && new Date(session.expectedEndTime) < new Date()) {
      await db.update(wifiSessions).set({
        status: 'expired',
        endTime: new Date(),
        endReason: 'expired',
      }).where(eq(wifiSessions.id, session.id))
      // Fall through para verificação de trusted
    } else {
      // Sessão válida — re-autorizar na controladora
      const remainingMinutes = session.expectedEndTime
        ? Math.ceil((new Date(session.expectedEndTime).getTime() - Date.now()) / 60000)
        : 60

      let controllerRedirectUrl: string | undefined
      if (remainingMinutes > 0) {
        const radiusToken = await createRadiusToken({
          macAddress,
          wifiUserId: user?.id,
          sessionMinutes: remainingMinutes,
          speedLimitUp: user?.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
          speedLimitDown: user?.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
        })

        const authResult = await ControllerService.authorizeGuest(
          settings,
          {
            macAddress,
            sessionMinutes: remainingMinutes,
            speedLimitUp: user?.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
            speedLimitDown: user?.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
            extra: {
              arubaParams,
              credentials: { user: radiusToken, password: radiusToken },
              finalRedirect: settings.successRedirectUrl,
            },
          },
          detectedController as 'unifi' | 'aruba' | null | undefined
        )
        controllerRedirectUrl = authResult.redirectUrl
      }

      return {
        hasActiveSession: true,
        userName: user?.name || 'Visitante',
        remainingMinutes,
        redirectUrl: controllerRedirectUrl || settings.successRedirectUrl || DEFAULT_SUCCESS_REDIRECT_URL,
      }
    }
  }

  // 2. Verificar se MAC pertence a um dispositivo TRUSTED
  const trustedDevice = await db.select({
    device: wifiUserDevices,
    user: wifiUsers,
  })
    .from(wifiUserDevices)
    .innerJoin(wifiUsers, eq(wifiUserDevices.wifiUserId, wifiUsers.id))
    .where(
      and(
        eq(wifiUserDevices.macAddress, macAddress),
        eq(wifiUserDevices.trusted, true),
        eq(wifiUsers.status, 'approved')
      )
    )
    .limit(1)

  // Fallback: campo macAddress legado no wifiUsers
  let user: typeof wifiUsers.$inferSelect | null = null
  let deviceId: string | null = null
  let deviceTrustedUntil: Date | null = null

  if (trustedDevice.length > 0) {
    user = trustedDevice[0].user
    deviceId = trustedDevice[0].device.id
    deviceTrustedUntil = trustedDevice[0].device.trustedUntil
  } else {
    const legacyTrusted = await db.select()
      .from(wifiUsers)
      .where(
        and(
          eq(wifiUsers.macAddress, macAddress),
          eq(wifiUsers.trusted, true),
          eq(wifiUsers.status, 'approved')
        )
      )
      .limit(1)
    if (legacyTrusted.length > 0) {
      user = legacyTrusted[0]
      deviceTrustedUntil = legacyTrusted[0].trustedUntil
    }
  }

  if (!user) {
    return { hasActiveSession: false }
  }

  // Verificar se a confiança expirou
  if (deviceTrustedUntil && new Date(deviceTrustedUntil) < new Date()) {
    if (deviceId) {
      await db.update(wifiUserDevices).set({ trusted: false, trustedUntil: null })
        .where(eq(wifiUserDevices.id, deviceId))
    } else {
      await db.update(wifiUsers).set({ trusted: false, trustedUntil: null, updatedAt: new Date() })
        .where(eq(wifiUsers.id, user.id))
    }
    return { hasActiveSession: false }
  }

  // Dispositivo trusted! Criar sessão automaticamente.
  console.log('[Portal] Trusted device auto-connect:', macAddress, user.name)

  if (deviceId) {
    await db.update(wifiUserDevices).set({ lastSeen: new Date() })
      .where(eq(wifiUserDevices.id, deviceId))
  }

  const sessionMinutes = user.sessionLimitMinutes || settings.defaultSessionMinutes || DEFAULT_SESSION_MINUTES

  const radiusToken = await createRadiusToken({
    macAddress,
    wifiUserId: user.id,
    sessionMinutes,
    speedLimitUp: user.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
    speedLimitDown: user.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
  })

  const authResult = await ControllerService.authorizeGuest(
    settings,
    {
      macAddress,
      sessionMinutes,
      speedLimitUp: user.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
      speedLimitDown: user.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
      extra: {
        arubaParams,
        credentials: { user: radiusToken, password: radiusToken },
        finalRedirect: settings.successRedirectUrl,
      },
    },
    detectedController as 'unifi' | 'aruba' | null | undefined
  )

  const sessionId = nanoid()
  const sessionEndTime = new Date(Date.now() + sessionMinutes * 60 * 1000)

  await db.insert(wifiSessions).values({
    id: sessionId,
    wifiUserId: user.id,
    macAddress,
    status: 'active',
    startTime: new Date(),
    expectedEndTime: sessionEndTime,
    createdAt: new Date(),
  })

  return {
    hasActiveSession: true,
    userName: user.name,
    remainingMinutes: sessionMinutes,
    redirectUrl: authResult.redirectUrl || settings.successRedirectUrl || DEFAULT_SUCCESS_REDIRECT_URL,
  }
}

// ============================================================================
// USER LOGIN
// ============================================================================

/**
 * Login de usuário WiFi (email + senha).
 */
export async function loginWifiUser(
  email: string,
  password: string,
  macAddress: string,
  detectedController?: string | null,
  arubaParams?: ArubaRedirectParams,
  sessionMeta?: SessionMeta
) {
  const parsed = loginWifiUserSchema.safeParse({ email, password, macAddress })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.email, parsed.data.email))
  if (users.length === 0) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  const user = users[0]
  const validPassword = await verifyPassword(password, user.password)
  if (!validPassword) {
    return { success: false, error: 'Senha incorreta' }
  }

  // MAC pré-autorizado → promove usuário pendente para aprovado automaticamente.
  // Cobre quem se cadastrou ANTES do MAC entrar na lista.
  if (user.status === 'pending') {
    const preauth = await findPreauthorizedByMac(macAddress)
    if (preauth) {
      await db.update(wifiUsers).set({
        status: 'approved',
        updatedAt: new Date(),
      }).where(eq(wifiUsers.id, user.id))
      user.status = 'approved'
      await markPreauthLinked(preauth, user.id)
    }
  }

  if (user.status === 'pending') {
    return { success: false, error: 'Aguardando aprovação do administrador' }
  }
  if (user.status === 'blocked') {
    return { success: false, error: 'Usuário bloqueado' }
  }

  // Verificar/resetar limite diário
  const today = new Date().toISOString().split('T')[0]
  if (user.lastResetDate !== today) {
    await db.update(wifiUsers).set({
      totalTimeUsedToday: 0,
      lastResetDate: sql`CURRENT_DATE`,
      updatedAt: new Date(),
    }).where(eq(wifiUsers.id, user.id))
    user.totalTimeUsedToday = 0
  }

  const remainingDaily = (user.dailyLimitMinutes || DEFAULT_DAILY_MINUTES) - (user.totalTimeUsedToday || 0)
  if (remainingDaily <= 0) {
    return { success: false, error: 'Limite diário atingido. Tente novamente amanhã.' }
  }

  const settings = await getPortalSettings()
  const sessionMinutes = Math.min(user.sessionLimitMinutes || DEFAULT_SESSION_MINUTES, remainingDaily)

  // Gerar token RADIUS
  const radiusToken = await createRadiusToken({
    macAddress,
    wifiUserId: user.id,
    sessionMinutes,
    speedLimitUp: user.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
    speedLimitDown: user.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
  })

  // Autorizar na controladora
  const authResult = await ControllerService.authorizeGuest(
    settings,
    {
      macAddress,
      sessionMinutes,
      speedLimitUp: user.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
      speedLimitDown: user.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
      extra: {
        arubaParams,
        credentials: { user: radiusToken, password: radiusToken },
        finalRedirect: settings.successRedirectUrl,
      },
    },
    detectedController as 'unifi' | 'aruba' | null | undefined
  )

  if (!authResult.success) {
    console.error('Controller authorization failed')
  }

  // Encerrar sessões ativas anteriores (login único)
  const existingActive = await db.select().from(wifiSessions).where(
    and(
      eq(wifiSessions.wifiUserId, user.id),
      eq(wifiSessions.status, 'active')
    )
  )

  for (const session of existingActive) {
    if (session.macAddress && session.macAddress !== macAddress) {
      await ControllerService.deauthorizeGuest(settings, { macAddress: session.macAddress })
    }
  }

  await db.update(wifiSessions).set({
    status: 'ended',
    endTime: new Date(),
    endReason: 'new_login',
  }).where(
    and(
      eq(wifiSessions.wifiUserId, user.id),
      eq(wifiSessions.status, 'active')
    )
  )

  // Registrar dispositivo e criar sessão
  await registerDevice(user.id, macAddress)

  const sessionId = nanoid()
  const sessionEndTime = new Date(Date.now() + sessionMinutes * 60 * 1000)

  await db.insert(wifiSessions).values({
    id: sessionId,
    wifiUserId: user.id,
    macAddress,
    apName: sessionMeta?.apName || null,
    ssid: sessionMeta?.ssid || null,
    site: sessionMeta?.site || null,
    lgpdAcceptedAt: sessionMeta?.lgpdAccepted ? new Date() : null,
    status: 'active',
    startTime: new Date(),
    expectedEndTime: sessionEndTime,
    createdAt: new Date(),
  })

  return {
    success: true,
    sessionId,
    sessionMinutes,
    userName: user.name,
    redirectUrl: authResult.redirectUrl,
  }
}

// ============================================================================
// VOUCHER LOGIN
// ============================================================================

/**
 * Login via código de voucher.
 */
export async function loginWithVoucher(
  code: string,
  macAddress: string,
  detectedController?: string | null,
  arubaParams?: ArubaRedirectParams,
  sessionMeta?: SessionMeta
) {
  const parsed = loginVoucherSchema.safeParse({ code, macAddress })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const vouchers = await db.select().from(wifiVouchers)
    .where(eq(wifiVouchers.code, parsed.data.code.toUpperCase()))

  if (vouchers.length === 0) {
    return { success: false, error: 'Codigo invalido' }
  }

  const voucher = vouchers[0]

  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return { success: false, error: 'Codigo expirado' }
  }

  if ((voucher.usedCount || 0) >= (voucher.maxUses || 1)) {
    return { success: false, error: 'Codigo ja utilizado o maximo de vezes' }
  }

  const settings = await getPortalSettings()

  // Gerar token RADIUS
  const radiusToken = await createRadiusToken({
    macAddress,
    voucherId: voucher.id,
    sessionMinutes: voucher.durationMinutes,
    speedLimitUp: voucher.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
    speedLimitDown: voucher.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
  })

  // Autorizar na controladora
  const authResult = await ControllerService.authorizeGuest(
    settings,
    {
      macAddress,
      sessionMinutes: voucher.durationMinutes,
      speedLimitUp: voucher.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
      speedLimitDown: voucher.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
      extra: {
        arubaParams,
        credentials: { user: radiusToken, password: radiusToken },
        finalRedirect: settings.successRedirectUrl,
      },
    },
    detectedController as 'unifi' | 'aruba' | null | undefined
  )

  if (!authResult.success) {
    console.error('Controller authorization failed')
  }

  // Atualizar uso do voucher
  await db.update(wifiVouchers).set({
    usedCount: (voucher.usedCount || 0) + 1,
  }).where(eq(wifiVouchers.id, voucher.id))

  // Criar sessão
  const sessionId = nanoid()
  const sessionEndTime = new Date(Date.now() + voucher.durationMinutes * 60 * 1000)

  await db.insert(wifiSessions).values({
    id: sessionId,
    wifiUserId: null,
    macAddress,
    apName: sessionMeta?.apName || null,
    ssid: sessionMeta?.ssid || null,
    site: sessionMeta?.site || null,
    lgpdAcceptedAt: sessionMeta?.lgpdAccepted ? new Date() : null,
    status: 'active',
    startTime: new Date(),
    expectedEndTime: sessionEndTime,
    createdAt: new Date(),
  })

  return {
    success: true,
    sessionMinutes: voucher.durationMinutes,
    redirectUrl: authResult.redirectUrl,
  }
}

// ============================================================================
// ADMIN: SESSION MANAGEMENT
// ============================================================================

/** Lista sessões ativas com dados do usuário. */
export async function getActiveSessions() {
  const sessions = await db
    .select({
      session: wifiSessions,
      user: wifiUsers,
    })
    .from(wifiSessions)
    .leftJoin(wifiUsers, eq(wifiSessions.wifiUserId, wifiUsers.id))
    .where(eq(wifiSessions.status, 'active'))
    .orderBy(desc(wifiSessions.startTime))

  return sessions.map(s => ({
    ...s.session,
    userName: s.user?.name || 'Visitante',
    userEmail: s.user?.email || '',
  }))
}

/** Encerra uma sessão manualmente e desautoriza na controladora. */
export async function endSession(sessionId: string) {
  const sessions = await db.select().from(wifiSessions).where(eq(wifiSessions.id, sessionId))

  if (sessions.length > 0) {
    const session = sessions[0]
    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 60000)

    // Desautorizar na controladora
    const settings = await getPortalSettings()
    await ControllerService.deauthorizeGuest(settings, { macAddress: session.macAddress })

    await db.update(wifiSessions).set({
      status: 'ended',
      endTime,
      duration,
      endReason: 'manual',
    }).where(eq(wifiSessions.id, sessionId))

    // Atualizar uso diário do usuário
    if (session.wifiUserId) {
      await db.update(wifiUsers).set({
        totalTimeUsedToday: sql`"totalTimeUsedToday" + ${duration}`,
        updatedAt: new Date(),
      }).where(eq(wifiUsers.id, session.wifiUserId))
    }
  }

  revalidatePath('/admin')
}
