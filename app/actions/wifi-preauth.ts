'use server'

/**
 * Server Actions — MACs Pré-autorizados
 *
 * Gerencia a lista de MACs "pré-autorizados". Ao se cadastrar/logar com um
 * desses MACs, o usuário é aprovado automaticamente (pula a fila de aprovação
 * manual). Cada entrada nasce "pending" (não vinculada) e vira "linked" quando
 * um usuário se cadastra/loga com aquele dispositivo.
 */

import { db } from '@/lib/db'
import { wifiPreauthorizedMacs, wifiUsers } from '@/lib/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { normalizeMac } from '@/lib/validations'
import { findPreauthorizedByMac } from '@/lib/preauth'

// ============================================================================
// ADMIN: CRUD / IMPORT
// ============================================================================

/**
 * Importa MACs em lote a partir de texto colado ou conteúdo de CSV.
 * Uma entrada por linha: `MAC` ou `MAC,rótulo` (também tolera `;` e tab).
 * Normaliza, deduplica, ignora inválidos e já existentes.
 */
export async function importPreauthorizedMacs(rawText: string) {
  const admin = await requireAdmin()

  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  let invalid = 0
  // Mapa mac -> label, deduplicando entradas repetidas no próprio input.
  const parsed = new Map<string, string | null>()

  for (const line of lines) {
    // Separa MAC e rótulo pelo primeiro separador (vírgula, ponto-e-vírgula ou tab).
    const sepMatch = line.match(/[,;\t]/)
    let macPart = line
    let labelPart: string | null = null
    if (sepMatch) {
      const idx = line.indexOf(sepMatch[0])
      macPart = line.slice(0, idx)
      labelPart = line.slice(idx + 1).trim() || null
    }

    const mac = normalizeMac(macPart)
    if (!mac) {
      invalid++
      continue
    }
    // Primeira ocorrência com rótulo prevalece.
    if (!parsed.has(mac) || (labelPart && !parsed.get(mac))) {
      parsed.set(mac, labelPart)
    }
  }

  const total = lines.length
  const macs = Array.from(parsed.keys())

  if (macs.length === 0) {
    return { added: 0, skipped: 0, invalid, total }
  }

  // Descobrir quais já existem para não duplicar.
  const existing = await db
    .select({ macAddress: wifiPreauthorizedMacs.macAddress })
    .from(wifiPreauthorizedMacs)
    .where(inArray(wifiPreauthorizedMacs.macAddress, macs))

  const existingSet = new Set(existing.map((e) => e.macAddress))

  const toInsert = macs
    .filter((mac) => !existingSet.has(mac))
    .map((mac) => ({
      id: nanoid(),
      macAddress: mac,
      label: parsed.get(mac) || null,
      status: 'pending',
      createdBy: admin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

  if (toInsert.length > 0) {
    await db.insert(wifiPreauthorizedMacs).values(toInsert)
  }

  revalidatePath('/admin')

  return {
    added: toInsert.length,
    skipped: existingSet.size,
    invalid,
    total,
  }
}

/** Adiciona um único MAC pré-autorizado. */
export async function addPreauthorizedMac(mac: string, label?: string | null) {
  const admin = await requireAdmin()

  const normalized = normalizeMac(mac)
  if (!normalized) {
    return { success: false, error: 'MAC inválido' }
  }

  const existing = await findPreauthorizedByMac(normalized)
  if (existing) {
    return { success: false, error: 'MAC já cadastrado' }
  }

  await db.insert(wifiPreauthorizedMacs).values({
    id: nanoid(),
    macAddress: normalized,
    label: label?.trim() || null,
    status: 'pending',
    createdBy: admin.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  revalidatePath('/admin')
  return { success: true }
}

/** Lista MACs pré-autorizados com dados do usuário vinculado (se houver). */
export async function getPreauthorizedMacs() {
  await requireAdmin()

  const rows = await db
    .select({
      preauth: wifiPreauthorizedMacs,
      userName: wifiUsers.name,
      userEmail: wifiUsers.email,
    })
    .from(wifiPreauthorizedMacs)
    .leftJoin(wifiUsers, eq(wifiPreauthorizedMacs.linkedUserId, wifiUsers.id))
    .orderBy(desc(wifiPreauthorizedMacs.createdAt))

  return rows.map((r) => ({
    ...r.preauth,
    userName: r.userName || null,
    userEmail: r.userEmail || null,
  }))
}

/** Exclui uma entrada pré-autorizada. */
export async function deletePreauthorizedMac(id: string) {
  await requireAdmin()
  await db.delete(wifiPreauthorizedMacs).where(eq(wifiPreauthorizedMacs.id, id))
  revalidatePath('/admin')
  return { success: true }
}

/** Vincula manualmente um MAC a um usuário existente. */
export async function linkPreauthorizedMacToUser(id: string, userId: string) {
  await requireAdmin()

  const user = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId)).limit(1)
  if (user.length === 0) {
    return { success: false, error: 'Usuário não encontrado' }
  }

  await db
    .update(wifiPreauthorizedMacs)
    .set({
      status: 'linked',
      linkedUserId: userId,
      linkedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(wifiPreauthorizedMacs.id, id))

  revalidatePath('/admin')
  return { success: true }
}

/** Remove o vínculo de um MAC (volta para "pending"). */
export async function unlinkPreauthorizedMac(id: string) {
  await requireAdmin()

  await db
    .update(wifiPreauthorizedMacs)
    .set({
      status: 'pending',
      linkedUserId: null,
      linkedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(wifiPreauthorizedMacs.id, id))

  revalidatePath('/admin')
  return { success: true }
}
