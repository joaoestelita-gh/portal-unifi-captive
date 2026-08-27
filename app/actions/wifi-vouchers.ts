'use server'

/**
 * Server Actions — WiFi Vouchers
 *
 * Geração, listagem e exclusão de vouchers de acesso.
 */

import { db } from '@/lib/db'
import { wifiVouchers } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { generateVouchersSchema } from '@/lib/validations'
import { DEFAULT_SPEED_DOWN_KBPS, DEFAULT_SPEED_UP_KBPS } from '@/lib/constants'

/**
 * Gera vouchers de acesso WiFi.
 *
 * @param data - Parâmetros: quantidade, duração, limites, validade
 * @returns Lista de códigos gerados
 */
export async function generateVouchers(data: {
  quantity: number
  durationMinutes: number
  speedLimitDown?: number
  speedLimitUp?: number
  maxUses?: number
  expiresAt?: Date
  createdBy: string
}) {
  const parsed = generateVouchersSchema.safeParse({
    count: data.quantity,
    durationMinutes: data.durationMinutes,
    speedLimitDown: data.speedLimitDown,
    speedLimitUp: data.speedLimitUp,
    maxUses: data.maxUses,
  })

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Dados inválidos para voucher')
  }

  const vouchers = []

  for (let i = 0; i < parsed.data.count; i++) {
    const code = nanoid(8).toUpperCase()
    vouchers.push({
      id: nanoid(),
      code,
      durationMinutes: parsed.data.durationMinutes,
      speedLimitDown: parsed.data.speedLimitDown || DEFAULT_SPEED_DOWN_KBPS,
      speedLimitUp: parsed.data.speedLimitUp || DEFAULT_SPEED_UP_KBPS,
      maxUses: parsed.data.maxUses || 1,
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

/** Lista todos os vouchers. */
export async function getVouchers() {
  try {
    return await db.select().from(wifiVouchers).orderBy(desc(wifiVouchers.createdAt))
  } catch (error) {
    console.error('[v0] getVouchers falhou, retornando lista vazia:', error)
    return []
  }
}

/** Exclui um voucher. */
export async function deleteVoucher(voucherId: string) {
  await db.delete(wifiVouchers).where(eq(wifiVouchers.id, voucherId))
  revalidatePath('/admin')
}
