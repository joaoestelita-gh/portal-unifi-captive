import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { wifiUsers, wifiSessions, portalSettings } from '@/lib/db/schema'
import { eq, lt, and, sql, inArray } from 'drizzle-orm'
import { ControllerService } from '@/lib/controllers'

/**
 * Cron Job — Sessões WiFi
 *
 * Responsabilidades:
 * 1. Encerrar sessões expiradas (batch)
 * 2. Resetar contadores diários de uso
 *
 * Chamado via Vercel Cron (a cada minuto) ou externamente.
 *
 * Otimizado para batch operations: busca todas as sessões expiradas,
 * agrupa deauthorizations por controller, e faz update em lote no DB.
 */

// --- Helpers ---

async function getControllerSettings() {
  const settings = await db.select().from(portalSettings).where(eq(portalSettings.id, 'default'))
  return settings[0] || null
}

// --- Route Handler ---

export async function GET(request: Request) {
  // Verificar CRON_SECRET para prevenir acesso não autorizado
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    expiredSessions: 0,
    resetUsers: 0,
    errors: [] as string[],
  }

  try {
    const settings = await getControllerSettings()
    const now = new Date()

    // 1. Buscar todas as sessões expiradas de uma vez
    const expiredSessions = await db
      .select()
      .from(wifiSessions)
      .where(
        and(
          eq(wifiSessions.status, 'active'),
          lt(wifiSessions.expectedEndTime, now)
        )
      )

    if (expiredSessions.length > 0) {
      // Deauthorize em paralelo (limitado a 10 concorrentes para não sobrecarregar)
      const BATCH_SIZE = 10
      for (let i = 0; i < expiredSessions.length; i += BATCH_SIZE) {
        const batch = expiredSessions.slice(i, i + BATCH_SIZE)

        await Promise.allSettled(
          batch.map(async (session) => {
            try {
              if (settings) {
                await ControllerService.deauthorizeGuest(settings, {
                  macAddress: session.macAddress,
                })
              }
            } catch (error) {
              results.errors.push(`Deauth failed for ${session.macAddress}: ${error}`)
            }
          })
        )
      }

      // Batch update: marcar todas as sessões como expiradas de uma vez
      const sessionIds = expiredSessions.map(s => s.id)
      await db.update(wifiSessions).set({
        status: 'expired',
        endTime: now,
        endReason: 'expired',
      }).where(inArray(wifiSessions.id, sessionIds))

      // Atualizar uso diário para cada usuário (agrupado)
      const userDurations = new Map<string, number>()
      for (const session of expiredSessions) {
        if (session.wifiUserId) {
          const duration = Math.round(
            (now.getTime() - new Date(session.startTime).getTime()) / 60000
          )
          userDurations.set(
            session.wifiUserId,
            (userDurations.get(session.wifiUserId) || 0) + duration
          )
        }
      }

      // Batch update dos contadores de uso por usuário
      for (const [userId, duration] of userDurations) {
        await db.update(wifiUsers).set({
          totalTimeUsedToday: sql`"totalTimeUsedToday" + ${duration}`,
          updatedAt: now,
        }).where(eq(wifiUsers.id, userId))
      }

      results.expiredSessions = expiredSessions.length
    }

    // 2. Resetar uso diário onde lastResetDate não é hoje
    const today = new Date().toISOString().split('T')[0]
    const resetResult = await db.update(wifiUsers).set({
      totalTimeUsedToday: 0,
      lastResetDate: sql`CURRENT_DATE`,
      updatedAt: now,
    }).where(sql`("lastResetDate" < ${today}::date OR "lastResetDate" IS NULL)`)

    // Note: Drizzle's update doesn't return affected count easily,
    // so we just report that the reset was attempted
    results.resetUsers = 0 // Cannot get exact count without extra query

    return NextResponse.json({
      success: true,
      message: `Processed ${results.expiredSessions} expired sessions`,
      ...results,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...results,
    }, { status: 500 })
  }
}
