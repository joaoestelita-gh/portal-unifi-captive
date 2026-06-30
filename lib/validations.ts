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
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  termsText: z.string().max(5000).optional().nullable(),
  successRedirectUrl: z.string().url('URL de redirecionamento inválida').max(500).optional().nullable(),
  defaultSessionMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  defaultDailyMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  defaultSpeedDown: z.number().int().min(0).optional().nullable(),
  defaultSpeedUp: z.number().int().min(0).optional().nullable(),
  requireApproval: z.boolean().optional().nullable(),
})

// --- Controller Settings ---

export const updateControllerSettingsSchema = z.object({
  controllerType: z.enum(['none', 'unifi', 'aruba', 'both']),
  unifiEnabled: z.boolean().optional(),
  arubaEnabled: z.boolean().optional(),
  unifiControllerUrl: z.string().max(500).default(''),
  unifiUsername: z.string().max(100).default(''),
  unifiPassword: z.string().max(200).default(''),
  unifiSite: z.string().max(100).default('default'),
  arubaControllerUrl: z.string().max(500).default(''),
  arubaClientId: z.string().max(200).default(''),
  arubaClientSecret: z.string().max(200).default(''),
})
