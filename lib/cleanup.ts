'use server'

import { db } from '@/lib/db'
import { wifiSessions, radiusTokens, portalAccessLogs } from '@/lib/db/schema'
import { lt, and, eq } from 'drizzle-orm'

/**
 * Cleanup expired sessions.
 * Marks sessions that have passed their expectedEndTime as 'expired'.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date()

  const result = await db
    .update(wifiSessions)
    .set({
      status: 'expired',
      endTime: now,
      endReason: 'expired',
    })
    .where(
      and(
        eq(wifiSessions.status, 'active'),
        lt(wifiSessions.expectedEndTime, now)
      )
    )

  const count = result.rowCount ?? 0
  if (count > 0) {
    console.log(`[Cleanup] Marked ${count} expired sessions`)
  }
  return count
}

/**
 * Cleanup expired and used RADIUS tokens.
 * Deletes tokens that are either expired or have been used more than 1 hour ago.
 */
export async function cleanupRadiusTokens(): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Delete expired tokens
  const expiredResult = await db
    .delete(radiusTokens)
    .where(lt(radiusTokens.expiresAt, new Date()))

  // Delete used tokens older than 1 hour (keep recent ones for audit)
  const usedResult = await db
    .delete(radiusTokens)
    .where(
      and(
        eq(radiusTokens.used, true),
        lt(radiusTokens.usedAt, oneHourAgo)
      )
    )

  const count = (expiredResult.rowCount ?? 0) + (usedResult.rowCount ?? 0)
  if (count > 0) {
    console.log(`[Cleanup] Deleted ${count} expired/used RADIUS tokens`)
  }
  return count
}

/**
 * Cleanup old portal access logs (older than specified days).
 */
export async function cleanupOldLogs(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

  const result = await db
    .delete(portalAccessLogs)
    .where(lt(portalAccessLogs.timestamp, cutoff))

  const count = result.rowCount ?? 0
  if (count > 0) {
    console.log(`[Cleanup] Deleted ${count} old portal logs (older than ${olderThanDays} days)`)
  }
  return count
}

/**
 * Run all cleanup tasks. Call this periodically (e.g. via cron endpoint).
 */
export async function runAllCleanups(): Promise<{
  expiredSessions: number
  deletedTokens: number
  deletedLogs: number
}> {
  const [expiredSessions, deletedTokens, deletedLogs] = await Promise.all([
    cleanupExpiredSessions(),
    cleanupRadiusTokens(),
    cleanupOldLogs(30),
  ])

  return { expiredSessions, deletedTokens, deletedLogs }
}
