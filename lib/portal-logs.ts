'use server'

import { db } from '@/lib/db'
import { portalAccessLogs } from '@/lib/db/schema'
import { desc, lt } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export interface PortalLog {
  timestamp: string
  controller: string
  mac: string | null
  ip: string | null
  ssid: string | null
  apName: string | null
  params: Record<string, string>
}

/**
 * Persist a portal access log to the database.
 * Replaces the previous in-memory implementation so logs survive restarts.
 */
export async function addPortalLog(log: PortalLog) {
  try {
    await db.insert(portalAccessLogs).values({
      id: nanoid(),
      timestamp: new Date(log.timestamp),
      controller: log.controller,
      mac: log.mac,
      ip: log.ip,
      ssid: log.ssid,
      apName: log.apName,
      params: JSON.stringify(log.params),
      createdAt: new Date(),
    })
  } catch (error) {
    // Don't let logging failures break the portal flow
    console.error('[PortalLogs] Failed to persist log:', error)
  }
}

/**
 * Retrieve recent portal access logs (newest first).
 * @param limit Maximum number of logs to return (default 50)
 */
export async function getPortalLogs(limit = 50): Promise<PortalLog[]> {
  const rows = await db
    .select()
    .from(portalAccessLogs)
    .orderBy(desc(portalAccessLogs.timestamp))
    .limit(limit)

  return rows.map((row) => ({
    timestamp: row.timestamp.toISOString(),
    controller: row.controller,
    mac: row.mac,
    ip: row.ip,
    ssid: row.ssid,
    apName: row.apName,
    params: row.params ? JSON.parse(row.params) : {},
  }))
}

/**
 * Delete logs older than the specified number of days.
 * Call periodically (e.g. via cron) to keep the table manageable.
 */
export async function clearOldPortalLogs(olderThanDays = 30) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
  await db.delete(portalAccessLogs).where(lt(portalAccessLogs.timestamp, cutoff))
}
