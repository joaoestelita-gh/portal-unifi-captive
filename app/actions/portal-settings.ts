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
import { encryptSecret, maskSecret } from '@/lib/secret-crypto'
import { updateControllerSettingsSchema, updatePortalSettingsSchema } from '@/lib/validations'

/**
 * Monta o objeto de configurações padrão do portal.
 */
function buildDefaultSettings() {
  return {
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
    unifiApiKey: null,
    unifiConsoleId: null,
    unifiSiteId: null,
    arubaControllerUrl: null,
    arubaClientId: null,
    arubaClientSecret: null,
    successRedirectUrl: null,
    updatedAt: new Date(),
  }
}

/**
 * Busca as configurações do portal (ou cria defaults se não existirem).
 *
 * Envolvido em try/catch para que o portal do visitante nunca quebre por
 * desalinhamento entre o schema (código) e o banco (ex.: migração pendente).
 * Nesse caso, retorna configurações padrão em memória.
 */
export async function getPortalSettings() {
  try {
    const settings = await db.select().from(portalSettings).where(eq(portalSettings.id, 'default'))

    if (settings.length === 0) {
      const defaultSettings = buildDefaultSettings()
      await db.insert(portalSettings).values(defaultSettings)
      return defaultSettings
    }

    return settings[0]
  } catch (error) {
    console.error('[v0] getPortalSettings falhou, usando defaults em memória:', error)
    return buildDefaultSettings()
  }
}

/**
 * Versão SEGURA para client components: mascara segredos e expõe apenas flags
 * booleanas indicando se cada segredo está configurado. NUNCA envie o retorno de
 * getPortalSettings() (que contém os segredos criptografados) para o browser.
 */
export async function getPortalSettingsForClient() {
  const settings = await getPortalSettings()
  return {
    ...settings,
    // Segredos removidos do payload enviado ao navegador
    unifiPassword: '',
    unifiApiKey: '',
    arubaClientSecret: '',
    // Flags de presença para a UI decidir o que exibir
    hasUnifiPassword: !!settings.unifiPassword,
    hasUnifiApiKey: !!settings.unifiApiKey,
    hasArubaClientSecret: !!settings.arubaClientSecret,
    // Placeholder visual (não revela tamanho nem conteúdo)
    unifiPasswordMask: maskSecret(settings.unifiPassword),
    unifiApiKeyMask: maskSecret(settings.unifiApiKey),
    arubaClientSecretMask: maskSecret(settings.arubaClientSecret),
  }
}

/**
 * Atualiza configurações gerais do portal (título, cores, limites padrão).
 */
export async function updatePortalSettings(data: Partial<typeof portalSettings.$inferInsert>) {
  // Valida e descarta chaves desconhecidas (protege contra payloads adulterados
  // e contra vazamento de campos não-editáveis via este endpoint).
  const parsed = updatePortalSettingsSchema.parse(data)
  await db.update(portalSettings)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(portalSettings.id, 'default'))
  revalidatePath('/admin')
}

/**
 * Atualiza configurações dos controllers (UniFi local, UniFi Cloud e Aruba).
 *
 * Segredos (senha UniFi, API key, client secret Aruba) são criptografados em
 * repouso. Se o campo do segredo vier VAZIO, o valor existente é preservado
 * (o formulário mascara segredos, então "vazio" significa "não alterado").
 */
export async function updateControllerSettings(data: {
  controllerType: string
  unifiEnabled?: boolean
  arubaEnabled?: boolean
  unifiControllerUrl?: string
  unifiUsername?: string
  unifiPassword?: string
  unifiSite?: string
  unifiApiKey?: string
  unifiConsoleId?: string
  unifiSiteId?: string
  arubaControllerUrl?: string
  arubaClientId?: string
  arubaClientSecret?: string
}) {
  // Validação de entrada (rejeita payloads malformados antes de tocar o banco)
  const parsed = updateControllerSettingsSchema.parse(data)

  // Carrega o registro atual para preservar segredos não alterados
  const currentRows = await db
    .select()
    .from(portalSettings)
    .where(eq(portalSettings.id, 'default'))
  const current = currentRows[0]

  const keepOrEncrypt = (incoming: string, existing: string | null | undefined) =>
    incoming ? encryptSecret(incoming) : (existing ?? null)

  await db.update(portalSettings).set({
    controllerType: parsed.controllerType,
    unifiEnabled: parsed.unifiEnabled ?? false,
    arubaEnabled: parsed.arubaEnabled ?? false,
    unifiControllerUrl: parsed.unifiControllerUrl,
    unifiUsername: parsed.unifiUsername,
    unifiPassword: keepOrEncrypt(parsed.unifiPassword, current?.unifiPassword),
    unifiSite: parsed.unifiSite,
    unifiApiKey: keepOrEncrypt(parsed.unifiApiKey ?? '', current?.unifiApiKey),
    unifiConsoleId: parsed.unifiConsoleId ?? current?.unifiConsoleId ?? null,
    unifiSiteId: parsed.unifiSiteId ?? current?.unifiSiteId ?? null,
    arubaControllerUrl: parsed.arubaControllerUrl,
    arubaClientId: parsed.arubaClientId,
    arubaClientSecret: keepOrEncrypt(parsed.arubaClientSecret, current?.arubaClientSecret),
    updatedAt: new Date(),
  }).where(eq(portalSettings.id, 'default'))

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Atualiza apenas as configurações UniFi local (legacy — mantida para compatibilidade).
 */
export async function updateUnifiSettings(data: {
  unifiControllerUrl: string
  unifiUsername: string
  unifiPassword: string
  unifiSite: string
}) {
  const currentRows = await db
    .select()
    .from(portalSettings)
    .where(eq(portalSettings.id, 'default'))
  const current = currentRows[0]

  await db.update(portalSettings).set({
    controllerType: 'unifi',
    unifiControllerUrl: data.unifiControllerUrl,
    unifiUsername: data.unifiUsername,
    unifiPassword: data.unifiPassword
      ? encryptSecret(data.unifiPassword)
      : (current?.unifiPassword ?? null),
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
