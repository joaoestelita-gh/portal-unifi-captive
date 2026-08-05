'use server'

/**
 * Server Actions — Portal Settings
 *
 * CRUD de configurações do portal captivo.
 * Separado do restante para seguir SRP.
 */

import { db } from '@/lib/db'
import { portalSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { DEFAULT_PORTAL_SETTINGS } from '@/lib/constants'

/**
 * Busca as configurações do portal (ou cria defaults se não existirem).
 */
export async function getPortalSettings() {
  const settings = await db.select().from(portalSettings).where(eq(portalSettings.id, 'default'))

  if (settings.length === 0) {
    const defaultSettings = {
      id: 'default',
      portalTitle: DEFAULT_PORTAL_SETTINGS.portalTitle,
      portalSubtitle: DEFAULT_PORTAL_SETTINGS.portalSubtitle,
      logoUrl: null,
      backgroundUrl: null,
      backgroundColor: null,
      termsText: null,
      primaryColor: DEFAULT_PORTAL_SETTINGS.primaryColor,
      secondaryColor: DEFAULT_PORTAL_SETTINGS.secondaryColor,
      colorScheme: 'default',
      defaultSessionMinutes: DEFAULT_PORTAL_SETTINGS.defaultSessionMinutes,
      defaultDailyMinutes: DEFAULT_PORTAL_SETTINGS.defaultDailyMinutes,
      defaultSpeedDown: DEFAULT_PORTAL_SETTINGS.defaultSpeedDown,
      defaultSpeedUp: DEFAULT_PORTAL_SETTINGS.defaultSpeedUp,
      requireApproval: DEFAULT_PORTAL_SETTINGS.requireApproval,
      controllerType: DEFAULT_PORTAL_SETTINGS.controllerType,
      unifiEnabled: false,
      arubaEnabled: false,
      unifiControllerUrl: null,
      unifiUsername: null,
      unifiPassword: null,
      unifiSite: null,
      arubaControllerUrl: null,
      arubaClientId: null,
      arubaClientSecret: null,
      successRedirectUrl: null,
      updatedAt: new Date(),
    }
    await db.insert(portalSettings).values(defaultSettings)
    return defaultSettings
  }

  return settings[0]
}

/**
 * Atualiza configurações gerais do portal (título, cores, limites padrão).
 */
export async function updatePortalSettings(data: Partial<typeof portalSettings.$inferInsert>) {
  await db.update(portalSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(portalSettings.id, 'default'))
  revalidatePath('/admin')
}

/**
 * Atualiza configurações dos controllers (UniFi + Aruba).
 */
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
    updatedAt: new Date(),
  }).where(eq(portalSettings.id, 'default'))

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Atualiza apenas as configurações UniFi (legacy — mantida para compatibilidade).
 */
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
    updatedAt: new Date(),
  }).where(eq(portalSettings.id, 'default'))

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Testa a conexão com um controller usando o ControllerService.
 */
export async function testControllerConnection(controllerType: string) {
  const { ControllerService } = await import('@/lib/controllers')
  const settings = await getPortalSettings()

  try {
    const result = await ControllerService.testConnection(settings, controllerType as 'unifi' | 'aruba')
    return {
      success: result.success,
      message: result.message,
      error: result.success ? undefined : result.message,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Testa a conexão UniFi (legacy wrapper).
 */
export async function testUnifiConnection() {
  return testControllerConnection('unifi')
}
