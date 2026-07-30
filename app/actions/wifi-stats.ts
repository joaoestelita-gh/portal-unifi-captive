'use server'

/**
 * Server Actions — WiFi Dashboard Stats
 *
 * Estatísticas do painel administrativo.
 */

import { db } from '@/lib/db'
import { wifiUsers, wifiSessions, wifiVouchers } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * Retorna estatísticas resumidas para o dashboard admin.
 */
export async function getDashboardStats() {
  const [totalUsers, pendingUsers, activeSessions, activeVouchers] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(wifiUsers),
    db.select({ count: sql<number>`count(*)` }).from(wifiUsers).where(eq(wifiUsers.status, 'pending')),
    db.select({ count: sql<number>`count(*)` }).from(wifiSessions).where(eq(wifiSessions.status, 'active')),
    db.select({ count: sql<number>`count(*)` }).from(wifiVouchers).where(sql`"usedCount" < "maxUses"`),
  ])

  return {
    totalUsers: Number(totalUsers[0]?.count) || 0,
    pendingUsers: Number(pendingUsers[0]?.count) || 0,
    activeSessions: Number(activeSessions[0]?.count) || 0,
    activeVouchers: Number(activeVouchers[0]?.count) || 0,
  }
}
