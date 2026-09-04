import { z } from 'zod'

// --- Auth validations ---

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export const registerAdminSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres').max(128),
})

// --- WiFi User validations ---

export const registerWifiUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().max(20).optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(128),
})

export const loginWifiUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  macAddress: z.string().max(50).default(''),
})

export const createWifiUserByAdminSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().max(20).optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(128),
  dailyLimitMinutes: z.number().int().min(1).max(1440).optional(),
  sessionLimitMinutes: z.number().int().min(1).max(1440).optional(),
  speedLimitDown: z.number().int().min(0).optional(),
  speedLimitUp: z.number().int().min(0).optional(),
})

// --- Voucher validations ---

export const generateVouchersSchema = z.object({
  count: z.number().int().min(1, 'Mínimo 1 voucher').max(100, 'Máximo 100 vouchers'),
  durationMinutes: z.number().int().min(1, 'Duração mínima: 1 minuto').max(43200),
  speedLimitDown: z.number().int().min(0).optional(),
  speedLimitUp: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional().nullable(),
})

// --- Voucher login ---

export const loginVoucherSchema = z.object({
  code: z.string().min(1, 'Código do voucher é obrigatório').max(50),
  macAddress: z.string().max(50).default(''),
})

// --- Portal Settings validations ---

export const updatePortalSettingsSchema = z.object({
  portalTitle: z.string().max(200).optional().nullable(),
  portalSubtitle: z.string().max(500).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  backgroundUrl: z.string().max(500).optional().nullable(),
  backgroundColor: z.string().max(20).optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  colorScheme: z.string().max(40).optional().nullable(),
  termsText: z.string().max(5000).optional().nullable(),
  // Aceita vazio (fallback padrão aplicado depois) e não força formato absoluto.
  successRedirectUrl: z.string().max(500).optional().nullable(),
  // 0 = ilimitado (sem sessão limitada); por isso min(0), não min(1).
  defaultSessionMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  defaultDailyMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  defaultSpeedDown: z.number().int().min(0).optional().nullable(),
  defaultSpeedUp: z.number().int().min(0).optional().nullable(),
  requireApproval: z.boolean().optional().nullable(),
})

// --- MAC address helpers ---

/**
 * Normaliza um MAC address para o formato canônico `aa:bb:cc:dd:ee:ff`
 * (minúsculo, separado por `:`). Remove separadores comuns (`:`, `-`, `.`,
 * espaços) antes de validar. Retorna `null` se não forem exatamente 12
 * dígitos hexadecimais.
 *
 * O UniFi já envia o MAC em minúsculas; normalizar dos dois lados garante o
 * casamento MAC↔lista independente de caixa/separador de origem.
 */
export function normalizeMac(raw: string | null | undefined): string | null {
  if (!raw) return null
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  if (hex.length !== 12) return null
  return hex.match(/.{2}/g)!.join(':')
}

// --- Redirect URL helpers ---

/**
 * Sanitiza uma URL de redirect vinda do cliente (query string do redirect do
 * controlador, params `redirect`/`url`). Só aceitamos http(s) absoluto — evita
 * open-redirect via `javascript:`/`data:` e valores quebrados.
 *
 * O host placeholder `conectar` (probe de captive portal) é tratado como
 * "sem redirect" para não jogar o usuário numa URL inválida.
 *
 * Retorna a URL normalizada, ou `undefined` se não for segura/válida.
 */
export function sanitizeRedirectUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined
    }
    if (parsed.hostname === 'conectar') return undefined
    return parsed.toString()
  } catch {
    // valor não é URL absoluta válida
    return undefined
  }
}

// --- Pre-authorized MAC validations ---

export const preauthMacSchema = z.object({
  mac: z.string().min(1, 'MAC é obrigatório').max(50),
  label: z.string().max(200).optional().nullable(),
})

export const preauthImportSchema = z.object({
  rawText: z.string().min(1, 'Cole ao menos um MAC').max(200000),
})

// --- Controller Settings ---

export const updateControllerSettingsSchema = z.object({
  controllerType: z.enum(['none', 'unifi', 'unifi-cloud', 'aruba', 'both']),
  unifiEnabled: z.boolean().optional(),
  arubaEnabled: z.boolean().optional(),
  // UniFi local (login por cookie)
  unifiControllerUrl: z.string().max(500).default(''),
  unifiUsername: z.string().max(100).default(''),
  unifiPassword: z.string().max(200).default(''),
  unifiSite: z.string().max(100).default('default'),
  // UniFi Cloud (Site Manager API + Connector Proxy)
  unifiApiKey: z.string().max(400).default(''),
  unifiConsoleId: z.string().max(200).default(''),
  unifiSiteId: z.string().max(200).default(''),
  // Aruba Instant On
  arubaControllerUrl: z.string().max(500).default(''),
  arubaClientId: z.string().max(200).default(''),
  arubaClientSecret: z.string().max(200).default(''),
})
