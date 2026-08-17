/**
 * Helpers server-only para MACs pré-autorizados.
 *
 * Fica FORA de um módulo `'use server'` de propósito: estas funções são usadas
 * internamente pelos fluxos de cadastro/login (públicos) e não devem ser
 * expostas como server actions chamáveis pelo cliente.
 */

import { db } from '@/lib/db'
import { wifiPreauthorizedMacs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizeMac } from '@/lib/validations'

export type PreauthMac = typeof wifiPreauthorizedMacs.$inferSelect

/**
 * Busca uma entrada pré-autorizada pelo MAC (normalizando antes de comparar).
 * Retorna `null` se o MAC for inválido ou não estiver na lista.
 */
export async function findPreauthorizedByMac(
  macAddress: string | null | undefined
): Promise<PreauthMac | null> {
  const mac = normalizeMac(macAddress)
  if (!mac) return null

  const rows = await db
    .select()
    .from(wifiPreauthorizedMacs)
    .where(eq(wifiPreauthorizedMacs.macAddress, mac))
    .limit(1)

  return rows[0] || null
}

/**
 * Marca uma entrada pré-autorizada como vinculada a um usuário.
 * Não sobrescreve um vínculo já existente com outro usuário.
 */
export async function markPreauthLinked(
  row: PreauthMac,
  userId: string
): Promise<void> {
  if (row.status === 'linked' && row.linkedUserId && row.linkedUserId !== userId) {
    // Já vinculado a outro usuário — mantém o vínculo original.
    return
  }

  await db
    .update(wifiPreauthorizedMacs)
    .set({
      status: 'linked',
      linkedUserId: userId,
      linkedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(wifiPreauthorizedMacs.id, row.id))
}
