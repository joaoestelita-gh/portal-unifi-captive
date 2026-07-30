'use server'

import { db } from '@/lib/db'
import { wifiSessions, wifiUsers } from '@/lib/db/schema'
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm'

// --- Types ---

export interface AnalyticsFilters {
  startDate?: string // ISO date string
  endDate?: string   // ISO date string
  apName?: string
  ssid?: string
}

export interface ConnectionsByAP {
  apName: string
  totalConnections: number
  uniqueUsers: number
}

export interface ConnectionsBySSID {
  ssid: string
  totalConnections: number
}

export interface ConnectionsByHour {
  hour: number // 0-23
  connections: number
}

export interface ConnectionsByDay {
  date: string // YYYY-MM-DD
  connections: number
}

export interface RecentConnection {
  id: string
  userName: string | null
  macAddress: string
  apName: string | null
  ssid: string | null
  startTime: Date
  status: string
}

export interface AnalyticsSummary {
  totalConnections: number
  uniqueUsers: number
  uniqueDevices: number
  uniqueAPs: number
  avgSessionMinutes: number
  lgpdAcceptanceRate: number
}

// --- Actions ---

/**
 * Retorna resumo geral de analytics com filtros opcionais.
 */
export async function getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
  const conditions = buildConditions(filters)

  const result = await db
    .select({
      totalConnections: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct "wifiUserId")`,
      uniqueDevices: sql<number>`count(distinct "macAddress")`,
      uniqueAPs: sql<number>`count(distinct "apName")`,
      avgDuration: sql<number>`coalesce(avg("duration"), 0)`,
      lgpdAccepted: sql<number>`count("lgpdAcceptedAt")`,
    })
    .from(wifiSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  const row = result[0]
  const total = Number(row?.totalConnections) || 0

  return {
    totalConnections: total,
    uniqueUsers: Number(row?.uniqueUsers) || 0,
    uniqueDevices: Number(row?.uniqueDevices) || 0,
    uniqueAPs: Number(row?.uniqueAPs) || 0,
    avgSessionMinutes: Math.round(Number(row?.avgDuration) || 0),
    lgpdAcceptanceRate: total > 0 ? Math.round((Number(row?.lgpdAccepted) / total) * 100) : 0,
  }
}

/**
 * Ranking de conexões por AP.
 */
export async function getConnectionsByAP(filters?: AnalyticsFilters): Promise<ConnectionsByAP[]> {
  const conditions = buildConditions(filters)
  // Só buscar sessões com apName preenchido
  conditions.push(sql`"apName" IS NOT NULL AND "apName" != ''`)

  const result = await db
    .select({
      apName: wifiSessions.apName,
      totalConnections: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct "wifiUserId")`,
    })
    .from(wifiSessions)
    .where(and(...conditions))
    .groupBy(wifiSessions.apName)
    .orderBy(sql`count(*) desc`)
    .limit(20)

  return result.map(r => ({
    apName: r.apName || 'Desconhecido',
    totalConnections: Number(r.totalConnections),
    uniqueUsers: Number(r.uniqueUsers),
  }))
}

/**
 * Conexões por SSID (rede WiFi).
 */
export async function getConnectionsBySSID(filters?: AnalyticsFilters): Promise<ConnectionsBySSID[]> {
  const conditions = buildConditions(filters)
  conditions.push(sql`"ssid" IS NOT NULL AND "ssid" != ''`)

  const result = await db
    .select({
      ssid: wifiSessions.ssid,
      totalConnections: sql<number>`count(*)`,
    })
    .from(wifiSessions)
    .where(and(...conditions))
    .groupBy(wifiSessions.ssid)
    .orderBy(sql`count(*) desc`)
    .limit(10)

  return result.map(r => ({
    ssid: r.ssid || 'Desconhecido',
    totalConnections: Number(r.totalConnections),
  }))
}

/**
 * Conexões por hora do dia (0-23).
 */
export async function getConnectionsByHour(filters?: AnalyticsFilters): Promise<ConnectionsByHour[]> {
  const conditions = buildConditions(filters)

  const result = await db
    .select({
      hour: sql<number>`extract(hour from "startTime")`,
      connections: sql<number>`count(*)`,
    })
    .from(wifiSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`extract(hour from "startTime")`)
    .orderBy(sql`extract(hour from "startTime")`)

  // Preencher horas sem conexão com 0
  const hourMap = new Map(result.map(r => [Number(r.hour), Number(r.connections)]))
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    connections: hourMap.get(i) || 0,
  }))
}

/**
 * Conexões por dia (últimos 30 dias).
 */
export async function getConnectionsByDay(filters?: AnalyticsFilters): Promise<ConnectionsByDay[]> {
  const conditions = buildConditions(filters)

  // Default: últimos 30 dias se não tiver filtro
  if (!filters?.startDate) {
    conditions.push(gte(wifiSessions.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
  }

  const result = await db
    .select({
      date: sql<string>`to_char("startTime", 'YYYY-MM-DD')`,
      connections: sql<number>`count(*)`,
    })
    .from(wifiSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sql`to_char("startTime", 'YYYY-MM-DD')`)
    .orderBy(sql`to_char("startTime", 'YYYY-MM-DD')`)

  return result.map(r => ({
    date: r.date,
    connections: Number(r.connections),
  }))
}

/**
 * Últimas conexões (mais recentes).
 */
export async function getRecentConnections(limit: number = 20, filters?: AnalyticsFilters): Promise<RecentConnection[]> {
  const conditions = buildConditions(filters)

  const result = await db
    .select({
      session: wifiSessions,
      user: wifiUsers,
    })
    .from(wifiSessions)
    .leftJoin(wifiUsers, eq(wifiSessions.wifiUserId, wifiUsers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(wifiSessions.startTime))
    .limit(limit)

  return result.map(r => ({
    id: r.session.id,
    userName: r.user?.name || null,
    macAddress: r.session.macAddress,
    apName: r.session.apName,
    ssid: r.session.ssid,
    startTime: r.session.startTime,
    status: r.session.status,
  }))
}

/**
 * Lista APs únicos para filtro (dropdown).
 */
export async function getUniqueAPs(): Promise<string[]> {
  const result = await db
    .select({ apName: wifiSessions.apName })
    .from(wifiSessions)
    .where(sql`"apName" IS NOT NULL AND "apName" != ''`)
    .groupBy(wifiSessions.apName)
    .orderBy(wifiSessions.apName)

  return result.map(r => r.apName!).filter(Boolean)
}

/**
 * Lista SSIDs únicos para filtro.
 */
export async function getUniqueSSIDs(): Promise<string[]> {
  const result = await db
    .select({ ssid: wifiSessions.ssid })
    .from(wifiSessions)
    .where(sql`"ssid" IS NOT NULL AND "ssid" != ''`)
    .groupBy(wifiSessions.ssid)
    .orderBy(wifiSessions.ssid)

  return result.map(r => r.ssid!).filter(Boolean)
}

// --- Helper ---

function buildConditions(filters?: AnalyticsFilters) {
  const conditions: ReturnType<typeof sql>[] = []

  if (filters?.startDate) {
    conditions.push(gte(wifiSessions.startTime, new Date(filters.startDate)))
  }
  if (filters?.endDate) {
    conditions.push(lte(wifiSessions.startTime, new Date(filters.endDate + 'T23:59:59')))
  }
  if (filters?.apName) {
    conditions.push(eq(wifiSessions.apName, filters.apName))
  }
  if (filters?.ssid) {
    conditions.push(eq(wifiSessions.ssid, filters.ssid))
  }

  return conditions
}
