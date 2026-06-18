import { z } from 'zod'

// --- WiFi User Registration ---
export const registerWifiUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  email: z
    .string()
    .email('Email invalido')
    .max(255, 'Email muito longo')
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .max(20, 'Telefone muito longo')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha muito longa'),
})

// --- WiFi User Login ---
export const loginWifiUserSchema = z.object({
  email: z
    .string()
    .email('Email invalido')
    .max(255, 'Email muito longo')
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Senha e obrigatoria')
    .max(128, 'Senha muito longa'),
  macAddress: z.string().max(50).default(''),
})

// --- Voucher Login ---
export const loginWithVoucherSchema = z.object({
  code: z
    .string()
    .min(1, 'Codigo e obrigatorio')
    .max(20, 'Codigo muito longo')
    .trim()
    .toUpperCase(),
  macAddress: z.string().max(50).default(''),
})

// --- Admin: Create WiFi User ---
export const createWifiUserByAdminSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .trim(),
  email: z
    .string()
    .email('Email invalido')
    .max(255, 'Email muito longo')
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha muito longa'),
  macAddress: z.string().max(50).optional().or(z.literal('')),
  dailyLimitMinutes: z.number().int().min(1).max(1440).optional(),
  sessionLimitMinutes: z.number().int().min(1).max(1440).optional(),
  speedLimitDown: z.number().int().min(0).max(1000000).optional(),
  speedLimitUp: z.number().int().min(0).max(1000000).optional(),
})

// --- Admin: Update User Limits ---
export const updateUserLimitsSchema = z.object({
  userId: z.string().min(1, 'ID do usuario e obrigatorio'),
  dailyLimitMinutes: z.number().int().min(1).max(1440).optional(),
  sessionLimitMinutes: z.number().int().min(1).max(1440).optional(),
  speedLimitDown: z.number().int().min(0).max(1000000).optional(),
  speedLimitUp: z.number().int().min(0).max(1000000).optional(),
})

// --- Admin: Generate Vouchers ---
export const generateVouchersSchema = z.object({
  quantity: z.number().int().min(1, 'Minimo 1 voucher').max(100, 'Maximo 100 vouchers'),
  durationMinutes: z.number().int().min(1, 'Duracao minima 1 minuto').max(43200, 'Duracao maxima 30 dias'),
  speedLimitDown: z.number().int().min(0).max(1000000).optional(),
  speedLimitUp: z.number().int().min(0).max(1000000).optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresAt: z.date().optional(),
  createdBy: z.string().min(1),
})

// --- Portal Settings ---
export const updatePortalSettingsSchema = z.object({
  portalTitle: z.string().max(200).optional().nullable(),
  portalSubtitle: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  backgroundUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  termsText: z.string().max(5000).optional().nullable(),
  successRedirectUrl: z.string().url().max(2000).optional().nullable().or(z.literal('')),
  defaultSessionMinutes: z.number().int().min(1).max(1440).optional(),
  defaultDailyMinutes: z.number().int().min(1).max(1440).optional(),
  defaultSpeedDown: z.number().int().min(0).max(1000000).optional(),
  defaultSpeedUp: z.number().int().min(0).max(1000000).optional(),
  requireApproval: z.boolean().optional(),
})

// --- Controller Settings ---
export const updateControllerSettingsSchema = z.object({
  controllerType: z.enum(['none', 'unifi', 'aruba', 'both']),
  unifiEnabled: z.boolean().optional(),
  arubaEnabled: z.boolean().optional(),
  unifiControllerUrl: z.string().max(500).default(''),
  unifiUsername: z.string().max(200).default(''),
  unifiPassword: z.string().max(200).default(''),
  unifiSite: z.string().max(100).default('default'),
  arubaControllerUrl: z.string().max(500).default(''),
  arubaClientId: z.string().max(200).default(''),
  arubaClientSecret: z.string().max(200).default(''),
})

// --- Admin Auth ---
export const signInSchema = z.object({
  email: z
    .string()
    .email('Email invalido')
    .max(255)
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Senha e obrigatoria')
    .max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual e obrigatoria').max(128),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres').max(128),
})
