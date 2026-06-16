'use server'

import { db } from '@/lib/db'
import { wifiUsers, wifiSessions, wifiVouchers, portalSettings } from '@/lib/db/schema'
import { eq, desc, sql, lt, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getUnifiClient } from '@/lib/unifi'
import { getArubaClient, type ArubaRedirectParams, type ArubaAuthCredentials } from '@/lib/aruba'
import { createRadiusToken } from '@/lib/radius'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Fetch available UniFi sites
export async function fetchUnifiSites(url: string, username: string, password: string) {
  try {
    const unifi = getUnifiClient({
      controllerUrl: url,
      username,
      password,
      site: 'default',
    })
    
    const sites = await unifi.getSites()
    return { 
      success: true, 
      sites: sites.map(s => ({ 
        id: s.name, 
        name: s.desc || s.name,
        role: s.role || 'admin'
      }))
    }
  } catch (error) {
    console.error('Error fetching UniFi sites:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar sites',
      sites: [] 
    }
  }
}

// Fetch UniFi site info and device details
export async function fetchUnifiSiteInfo(url: string, username: string, password: string, site: string) {
  try {
    const unifi = getUnifiClient({
      controllerUrl: url,
      username,
      password,
      site,
    })
    
    const siteInfo = await unifi.getSiteInfo()
    
    // Find gateway device
    const gateway = siteInfo.devices.find(d => d.type === 'ugw' || d.type === 'udm' || d.type === 'usg')
    const wanHealth = siteInfo.health.find(h => h.subsystem === 'wan')
    const wlanHealth = siteInfo.health.find(h => h.subsystem === 'wlan')
    const lanHealth = siteInfo.health.find(h => h.subsystem === 'lan')
    
    return { 
      success: true, 
      info: {
        siteName: siteInfo.siteName,
        clientCount: siteInfo.clientCount,
        guestCount: siteInfo.guestCount,
        gateway: gateway ? {
          name: gateway.name || 'Cloud Gateway',
          model: gateway.model,
          ip: gateway.ip,
          lanIp: gateway.lan_ip,
          wanIp: gateway.wan_ip || wanHealth?.wan_ip,
          version: gateway.displayable_version || gateway.version,
          uptime: gateway.uptime,
          state: gateway.state === 1 ? 'online' : 'offline',
          mac: gateway.mac,
        } : null,
        wan: wanHealth ? {
          status: wanHealth.status,
          ip: wanHealth.wan_ip,
          gateways: wanHealth.gateways,
        } : null,
        wlan: wlanHealth ? {
          status: wlanHealth.status,
          numAp: wlanHealth.num_ap,
          numGuest: wlanHealth.num_guest,
        } : null,
        lan: lanHealth ? {
          status: lanHealth.status,
          numSw: lanHealth.num_sw,
        } : null,
        devices: siteInfo.devices.map(d => ({
          name: d.name || d.model,
          model: d.model,
          type: d.type,
          ip: d.ip,
          mac: d.mac,
          version: d.displayable_version || d.version,
          state: d.state === 1 ? 'online' : 'offline',
          clients: d.num_sta || 0,
          guests: d.guest_num_sta || 0,
        })),
      }
    }
  } catch (error) {
    console.error('Error fetching UniFi site info:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar informacoes',
      info: null 
    }
  }
}

// Helper to deauthorize/disconnect guest on the configured controller
async function deauthorizeOnController(macAddress: string): Promise<{ success: boolean }> {
  const settings = await getPortalSettings()
  
  // Try UniFi
  if (settings.controllerType === 'unifi' || settings.controllerType === 'both') {
    if (settings.unifiControllerUrl && settings.unifiUsername && settings.unifiPassword) {
      try {
        const unifi = getUnifiClient({
          controllerUrl: settings.unifiControllerUrl,
          username: settings.unifiUsername,
          password: settings.unifiPassword,
          site: settings.unifiSite || 'default',
        })
        await unifi.unauthorizeGuest(macAddress)
        await unifi.kickClient(macAddress)
        console.log('[UniFi] Client deauthorized and kicked:', macAddress)
      } catch (error) {
        console.error('[UniFi] Deauthorization error:', error)
      }
    }
  }
  
  // Aruba Instant On doesn't have API for deauthorization
  // The client will be disconnected when session expires on the AP
  
  return { success: true }
}

// Helper to authorize guest on the configured controller
// detectedController: auto-detected from portal params ('unifi' | 'aruba' | null)
async function authorizeOnController(
  macAddress: string,
  minutes: number,
  speedUp: number,
  speedDown: number,
  clientIp?: string,
  detectedController?: string | null,
  arubaParams?: ArubaRedirectParams,
  credentials?: ArubaAuthCredentials
): Promise<{ success: boolean; redirectUrl?: string }> {
  const settings = await getPortalSettings()
  
  // Determine which controller to use
  // Priority: detected > configured single > first enabled in 'both' mode
  let useUnifi = false
  let useAruba = false
  
  if (settings.controllerType === 'both') {
    // In 'both' mode, use detected controller or try both
    if (detectedController === 'unifi' && settings.unifiEnabled) {
      useUnifi = true
    } else if (detectedController === 'aruba' && settings.arubaEnabled) {
      useAruba = true
    } else if (settings.unifiEnabled) {
      useUnifi = true
    } else if (settings.arubaEnabled) {
      useAruba = true
    }
  } else if (settings.controllerType === 'unifi') {
    useUnifi = true
  } else if (settings.controllerType === 'aruba') {
    useAruba = true
  }
  
  if (useUnifi) {
    if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
      console.warn('UniFi not configured, skipping authorization')
      return { success: true }
    }
    
    try {
      const unifi = getUnifiClient({
        controllerUrl: settings.unifiControllerUrl,
        username: settings.unifiUsername,
        password: settings.unifiPassword,
        site: settings.unifiSite || 'default',
      })
      await unifi.authorizeGuest(macAddress, minutes, speedUp, speedDown)
      return { success: true }
    } catch (error) {
      console.error('UniFi authorization error:', error)
      return { success: false }
    }
  }
  
  if (useAruba) {
    try {
      const aruba = getArubaClient({
        baseUrl: settings.arubaControllerUrl || '',
        clientId: settings.arubaClientId || undefined,
        clientSecret: settings.arubaClientSecret || undefined,
      })
      
      // Try API first if credentials are available
      if (settings.arubaClientId && settings.arubaClientSecret) {
        const apiResult = await aruba.authorizeGuestViaApi(macAddress, minutes, speedUp, speedDown)
        if (apiResult) {
          return { success: true }
        }
      }
      
      // Aruba auth flow depends on the mode configured by the admin (and set
      // on the AP). 'confirmation' returns the Acknowledge token; 'radius'
      // redirects to /cgi-bin/login with the single-use token.
      const authMode = settings.arubaAuthMode === 'radius' ? 'radius' : 'confirmation'
      const result = await aruba.authorizeGuest(
        macAddress,
        minutes,
        clientIp,
        arubaParams,
        credentials,
        settings.successRedirectUrl || undefined,
        authMode
      )
      return { success: true, redirectUrl: result.redirectUrl }
    } catch (error) {
      console.error('Aruba authorization error:', error)
      return { success: false }
    }
  }
  
  // No controller configured
  return { success: true }
}

// Helper to unauthorize guest on the configured controller
async function unauthorizeOnController(macAddress: string): Promise<boolean> {
  const settings = await getPortalSettings()
  
  if (settings.controllerType === 'unifi') {
    if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
      return true
    }
    
    try {
      const unifi = getUnifiClient({
        controllerUrl: settings.unifiControllerUrl,
        username: settings.unifiUsername,
        password: settings.unifiPassword,
        site: settings.unifiSite || 'default',
      })
      await unifi.unauthorizeGuest(macAddress)
      return true
    } catch (error) {
      console.error('UniFi unauthorize error:', error)
      return false
    }
  }
  
  if (settings.controllerType === 'aruba') {
    if (!settings.arubaControllerUrl || !settings.arubaClientId || !settings.arubaClientSecret) {
      return true
    }
    
    try {
      const aruba = getArubaClient({
        baseUrl: settings.arubaControllerUrl,
        clientId: settings.arubaClientId,
        clientSecret: settings.arubaClientSecret,
      })
      return await aruba.unauthorizeGuest(macAddress)
    } catch (error) {
      console.error('Aruba unauthorize error:', error)
      return false
    }
  }
  
  return true
}

// Portal Settings
export async function getPortalSettings() {
  const settings = await db.select().from(portalSettings).where(eq(portalSettings.id, 'default'))
  if (settings.length === 0) {
    // Create default settings
    const defaultSettings = {
      id: 'default',
      portalTitle: 'WiFi Gratuito',
      portalSubtitle: 'Conecte-se à nossa rede',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      defaultSessionMinutes: 120,
      defaultDailyMinutes: 240,
      defaultSpeedDown: 10240,
      defaultSpeedUp: 5120,
      requireApproval: true,
      controllerType: 'none',
      arubaAuthMode: 'confirmation',
      updatedAt: new Date(),
    }
    await db.insert(portalSettings).values(defaultSettings)
    return defaultSettings
  }
  return settings[0]
}

export async function updatePortalSettings(data: Partial<typeof portalSettings.$inferInsert>) {
  await db.update(portalSettings).set({ ...data, updatedAt: new Date() }).where(eq(portalSettings.id, 'default'))
  revalidatePath('/admin')
}

// Controller Settings (UniFi + Aruba)
export async function updateControllerSettings(data: {
  controllerType: string
  unifiEnabled?: boolean
  arubaEnabled?: boolean
  unifiControllerUrl: string
  unifiUsername: string
  unifiPassword: string
  unifiSite: string
  arubaControllerUrl: string
  arubaClientId: string
  arubaClientSecret: string
  arubaAuthMode?: string
}) {
  await db.update(portalSettings).set({
    controllerType: data.controllerType,
    unifiEnabled: data.unifiEnabled ?? false,
    arubaEnabled: data.arubaEnabled ?? false,
    unifiControllerUrl: data.unifiControllerUrl,
    unifiUsername: data.unifiUsername,
    unifiPassword: data.unifiPassword,
    unifiSite: data.unifiSite,
    arubaControllerUrl: data.arubaControllerUrl,
    arubaClientId: data.arubaClientId,
    arubaClientSecret: data.arubaClientSecret,
    arubaAuthMode: data.arubaAuthMode ?? 'confirmation',
    updatedAt: new Date()
  }).where(eq(portalSettings.id, 'default'))
  revalidatePath('/admin')
  return { success: true }
}

export async function testControllerConnection(controllerType: string) {
  try {
    const settings = await getPortalSettings()
    
    if (controllerType === 'unifi') {
      if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
        return { success: false, error: 'Configuracoes UniFi incompletas' }
      }
      
      const client = getUnifiClient({
        controllerUrl: settings.unifiControllerUrl,
        username: settings.unifiUsername,
        password: settings.unifiPassword,
        site: settings.unifiSite || 'default',
      })
      
      if (client) {
        return { success: true, message: 'Conexao UniFi estabelecida!' }
      }
      return { success: false, error: 'Falha ao conectar ao UniFi' }
    }

    if (controllerType === 'aruba') {
      if (!settings.arubaControllerUrl) {
        return { success: false, error: 'URL do Aruba nao configurada' }
      }
      
      // HP Aruba test - try to reach the portal/gateway
      try {
        const response = await fetch(settings.arubaControllerUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        })
        if (response.ok || response.status === 401 || response.status === 403 || response.status === 302) {
          // 401/403/302 means the server is reachable
          return { success: true, message: 'HP Aruba acessivel!' }
        }
        return { success: false, error: `HP Aruba retornou status ${response.status}` }
      } catch {
        return { success: false, error: 'Nao foi possivel conectar ao HP Aruba' }
      }
    }
    
    return { success: false, error: 'Tipo de controladora invalido' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// UniFi Settings (legacy - kept for compatibility)
export async function updateUnifiSettings(data: {
  unifiControllerUrl: string
  unifiUsername: string
  unifiPassword: string
  unifiSite: string
}) {
  await db.update(portalSettings).set({ 
    controllerType: 'unifi',
    unifiControllerUrl: data.unifiControllerUrl,
    unifiUsername: data.unifiUsername,
    unifiPassword: data.unifiPassword,
    unifiSite: data.unifiSite,
    updatedAt: new Date() 
  }).where(eq(portalSettings.id, 'default'))
  revalidatePath('/admin')
  return { success: true }
}

export async function testUnifiConnection() {
  try {
    const settings = await getPortalSettings()
    if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
      return { success: false, error: 'Configuracoes UniFi incompletas' }
    }
    
    const client = await getUnifiClient({
      controllerUrl: settings.unifiControllerUrl,
      username: settings.unifiUsername,
      password: settings.unifiPassword,
      site: settings.unifiSite || 'default',
    })
    
    if (client) {
      return { success: true, message: 'Conexao estabelecida com sucesso!' }
    }
    return { success: false, error: 'Falha ao conectar' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

// WiFi User Registration
export async function registerWifiUser(data: {
  name: string
  email: string
  phone?: string
  password: string
}) {
  const settings = await getPortalSettings()
  const hashedPassword = await hashPassword(data.password)
  
  const existingUser = await db.select().from(wifiUsers).where(eq(wifiUsers.email, data.email))
  if (existingUser.length > 0) {
    return { success: false, error: 'Email já cadastrado' }
  }

  const newUser = {
    id: nanoid(),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    password: hashedPassword,
    status: settings.requireApproval ? 'pending' : 'approved',
    dailyLimitMinutes: settings.defaultDailyMinutes,
    sessionLimitMinutes: settings.defaultSessionMinutes,
    speedLimitDown: settings.defaultSpeedDown,
    speedLimitUp: settings.defaultSpeedUp,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(wifiUsers).values(newUser)
  
  return { 
    success: true, 
    requiresApproval: settings.requireApproval,
    userId: newUser.id 
  }
}

// Check if MAC has active session and auto-reconnect
export async function checkActiveSession(macAddress: string, detectedController?: string | null, arubaParams?: ArubaRedirectParams) {
  if (!macAddress) {
    return { hasActiveSession: false }
  }

  // Find active session for this MAC
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

  if (activeSessions.length === 0) {
    return { hasActiveSession: false }
  }

  const { session, user } = activeSessions[0]

  // Check if session is still valid (not expired)
  if (session.expectedEndTime && new Date(session.expectedEndTime) < new Date()) {
    // Session expired, mark it
    await db.update(wifiSessions).set({
      status: 'expired',
      endTime: new Date(),
      endReason: 'expired'
    }).where(eq(wifiSessions.id, session.id))
    return { hasActiveSession: false }
  }

  // Session is still valid - re-authorize on controller
  const settings = await getPortalSettings()
  const remainingMinutes = session.expectedEndTime 
    ? Math.ceil((new Date(session.expectedEndTime).getTime() - Date.now()) / 60000)
    : 60

  let controllerRedirectUrl: string | undefined
  if (remainingMinutes > 0) {
    // Issue a single-use RADIUS token validated by FreeRADIUS through our REST endpoint.
    const radiusToken = await createRadiusToken({
      macAddress,
      wifiUserId: user?.id,
      sessionMinutes: remainingMinutes,
      speedLimitUp: user?.speedLimitUp || 5120,
      speedLimitDown: user?.speedLimitDown || 10240,
    })

    const authResult = await authorizeOnController(
      macAddress,
      remainingMinutes,
      user?.speedLimitUp || 5120,
      user?.speedLimitDown || 10240,
      undefined,
      detectedController,
      arubaParams,
      { user: radiusToken, password: radiusToken }
    )
    controllerRedirectUrl = authResult.redirectUrl
  }

  return { 
    hasActiveSession: true, 
    userName: user?.name || 'Visitante',
    remainingMinutes,
    // For Aruba, redirect back to the AP (switchip) to re-grant access;
    // otherwise use the configured success URL.
    redirectUrl: controllerRedirectUrl || settings.successRedirectUrl || 'https://google.com'
  }
}

// WiFi User Login
export async function loginWifiUser(email: string, password: string, macAddress: string, detectedController?: string | null, arubaParams?: ArubaRedirectParams) {
  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.email, email))
  
  if (users.length === 0) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  const user = users[0]
  const validPassword = await verifyPassword(password, user.password)
  
  if (!validPassword) {
    return { success: false, error: 'Senha incorreta' }
  }

  if (user.status === 'pending') {
    return { success: false, error: 'Aguardando aprovação do administrador' }
  }

  if (user.status === 'blocked') {
    return { success: false, error: 'Usuário bloqueado' }
  }

  // Check daily limit
  const today = new Date().toISOString().split('T')[0]
  if (user.lastResetDate !== today) {
    // Reset daily usage
    await db.update(wifiUsers).set({ 
      totalTimeUsedToday: 0, 
      lastResetDate: sql`CURRENT_DATE`,
      updatedAt: new Date() 
    }).where(eq(wifiUsers.id, user.id))
    user.totalTimeUsedToday = 0
  }

  const remainingDaily = (user.dailyLimitMinutes || 240) - (user.totalTimeUsedToday || 0)
  if (remainingDaily <= 0) {
    return { success: false, error: 'Limite diário atingido. Tente novamente amanhã.' }
  }

  // Authorize on controller
  const sessionMinutes = Math.min(user.sessionLimitMinutes || 120, remainingDaily)

  // Issue a single-use RADIUS token validated by FreeRADIUS through our REST endpoint.
  const radiusToken = await createRadiusToken({
    macAddress,
    wifiUserId: user.id,
    sessionMinutes,
    speedLimitUp: user.speedLimitUp || 5120,
    speedLimitDown: user.speedLimitDown || 10240,
  })

  const authResult = await authorizeOnController(
    macAddress,
    sessionMinutes,
    user.speedLimitUp || 5120,
    user.speedLimitDown || 10240,
    undefined,
    detectedController,
    arubaParams,
    { user: radiusToken, password: radiusToken }
  )

  if (!authResult.success) {
    console.error('Controller authorization failed')
  }

  // Encerrar sessões ativas anteriores do usuário (login único)
  // Primeiro busca as sessões ativas para desautorizar na controladora
  const activeSessions = await db.select().from(wifiSessions).where(
    and(
      eq(wifiSessions.wifiUserId, user.id),
      eq(wifiSessions.status, 'active')
    )
  )
  
  // Desautoriza os MACs antigos na controladora
  for (const session of activeSessions) {
    if (session.macAddress && session.macAddress !== macAddress) {
      await deauthorizeOnController(session.macAddress)
    }
  }
  
  // Marca sessões como encerradas no banco
  await db.update(wifiSessions).set({
    status: 'ended',
    endTime: new Date(),
    endReason: 'new_login'
  }).where(
    and(
      eq(wifiSessions.wifiUserId, user.id),
      eq(wifiSessions.status, 'active')
    )
  )

  // Update user MAC and create session
  await db.update(wifiUsers).set({ 
    macAddress, 
    updatedAt: new Date() 
  }).where(eq(wifiUsers.id, user.id))

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
    success: true, 
    sessionId,
    sessionMinutes,
    userName: user.name,
    redirectUrl: authResult.redirectUrl,
  }
}

// Voucher Login
export async function loginWithVoucher(code: string, macAddress: string, detectedController?: string | null, arubaParams?: ArubaRedirectParams) {
  const vouchers = await db.select().from(wifiVouchers).where(eq(wifiVouchers.code, code.toUpperCase()))
  
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

  // Issue a single-use RADIUS token validated by FreeRADIUS through our REST endpoint.
  const radiusToken = await createRadiusToken({
    macAddress,
    voucherId: voucher.id,
    sessionMinutes: voucher.durationMinutes,
    speedLimitUp: voucher.speedLimitUp || 5120,
    speedLimitDown: voucher.speedLimitDown || 10240,
  })

  // Authorize on controller
  const authResult = await authorizeOnController(
    macAddress,
    voucher.durationMinutes,
    voucher.speedLimitUp || 5120,
    voucher.speedLimitDown || 10240,
    undefined,
    detectedController,
    arubaParams,
    { user: radiusToken, password: radiusToken }
  )

  if (!authResult.success) {
    console.error('Controller authorization failed')
  }

  // Update voucher usage
  await db.update(wifiVouchers).set({ 
    usedCount: (voucher.usedCount || 0) + 1 
  }).where(eq(wifiVouchers.id, voucher.id))

  // Create session for voucher
  const sessionId = nanoid()
  const sessionEndTime = new Date(Date.now() + voucher.durationMinutes * 60 * 1000)
  
  await db.insert(wifiSessions).values({
    id: sessionId,
    wifiUserId: null,
    macAddress,
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

// Admin: Get all WiFi users
export async function getWifiUsers() {
  return db.select().from(wifiUsers).orderBy(desc(wifiUsers.createdAt))
}

// Admin: Get pending users
export async function getPendingUsers() {
  return db.select().from(wifiUsers).where(eq(wifiUsers.status, 'pending')).orderBy(desc(wifiUsers.createdAt))
}

// Admin: Approve user
export async function approveUser(userId: string) {
  await db.update(wifiUsers).set({ 
    status: 'approved', 
    updatedAt: new Date() 
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

// Admin: Block user
export async function blockUser(userId: string) {
  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId))
  if (users.length > 0 && users[0].macAddress) {
    await deauthorizeOnController(users[0].macAddress)
  }
  
  await db.update(wifiUsers).set({ 
    status: 'blocked', 
    updatedAt: new Date() 
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

// Admin: Delete user
export async function deleteWifiUser(userId: string) {
  const users = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId))
  if (users.length > 0 && users[0].macAddress) {
    await unauthorizeOnController(users[0].macAddress)
  }
  
  await db.delete(wifiSessions).where(eq(wifiSessions.wifiUserId, userId))
  await db.delete(wifiUsers).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

// Admin: Update user limits
export async function updateUserLimits(userId: string, limits: {
  dailyLimitMinutes?: number
  sessionLimitMinutes?: number
  speedLimitDown?: number
  speedLimitUp?: number
}) {
  await db.update(wifiUsers).set({ 
    ...limits, 
    updatedAt: new Date() 
  }).where(eq(wifiUsers.id, userId))
  revalidatePath('/admin')
}

// Admin: Get active sessions
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

// Admin: End session
export async function endSession(sessionId: string) {
  const sessions = await db.select().from(wifiSessions).where(eq(wifiSessions.id, sessionId))
  
  if (sessions.length > 0) {
    const session = sessions[0]
    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 60000)
    
    // Desautoriza o MAC na controladora (desconecta imediatamente)
    await deauthorizeOnController(session.macAddress)

    await db.update(wifiSessions).set({
      status: 'ended',
      endTime,
      duration,
      endReason: 'manual',
    }).where(eq(wifiSessions.id, sessionId))

    // Update user's daily usage
    if (session.wifiUserId) {
      await db.update(wifiUsers).set({
        totalTimeUsedToday: sql`"totalTimeUsedToday" + ${duration}`,
        updatedAt: new Date(),
      }).where(eq(wifiUsers.id, session.wifiUserId))
    }
  }
  
  revalidatePath('/admin')
}

// Admin: Generate vouchers
export async function generateVouchers(data: {
  quantity: number
  durationMinutes: number
  speedLimitDown?: number
  speedLimitUp?: number
  maxUses?: number
  expiresAt?: Date
  createdBy: string
}) {
  const vouchers = []
  
  for (let i = 0; i < data.quantity; i++) {
    const code = nanoid(8).toUpperCase()
    vouchers.push({
      id: nanoid(),
      code,
      durationMinutes: data.durationMinutes,
      speedLimitDown: data.speedLimitDown || 10240,
      speedLimitUp: data.speedLimitUp || 5120,
      maxUses: data.maxUses || 1,
      usedCount: 0,
      expiresAt: data.expiresAt || null,
      createdBy: data.createdBy,
      createdAt: new Date(),
    })
  }

  await db.insert(wifiVouchers).values(vouchers)
  revalidatePath('/admin')
  
  return vouchers.map(v => v.code)
}

// Admin: Get vouchers
export async function getVouchers() {
  return db.select().from(wifiVouchers).orderBy(desc(wifiVouchers.createdAt))
}

// Admin: Delete voucher
export async function deleteVoucher(voucherId: string) {
  await db.delete(wifiVouchers).where(eq(wifiVouchers.id, voucherId))
  revalidatePath('/admin')
}

// Admin: Get dashboard stats
export async function getDashboardStats() {
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(wifiUsers)
  const pendingUsers = await db.select({ count: sql<number>`count(*)` }).from(wifiUsers).where(eq(wifiUsers.status, 'pending'))
  const activeSessions = await db.select({ count: sql<number>`count(*)` }).from(wifiSessions).where(eq(wifiSessions.status, 'active'))
  const activeVouchers = await db.select({ count: sql<number>`count(*)` }).from(wifiVouchers).where(sql`"usedCount" < "maxUses"`)
  
  return {
    totalUsers: Number(totalUsers[0]?.count) || 0,
    pendingUsers: Number(pendingUsers[0]?.count) || 0,
    activeSessions: Number(activeSessions[0]?.count) || 0,
    activeVouchers: Number(activeVouchers[0]?.count) || 0,
  }
}

// Admin: Create WiFi user manually (already approved)
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
  const hashedPassword = await hashPassword(data.password)
  
  const existingUser = await db.select().from(wifiUsers).where(eq(wifiUsers.email, data.email))
  if (existingUser.length > 0) {
    return { success: false, error: 'Email ja cadastrado' }
  }

  const newUser = {
    id: nanoid(),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    password: hashedPassword,
    macAddress: data.macAddress || null,
    status: 'approved', // Admin creates already approved
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
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    }
  }
}

// Admin: Update WiFi user
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
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  
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
