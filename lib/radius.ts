import { db } from './db'
import { radiusTokens } from './db/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// How long a freshly issued token stays valid before the guest must
// re-authenticate on the portal (the AP usually authenticates within seconds).
const DEFAULT_TTL_MINUTES = 10

interface CreateRadiusTokenParams {
  macAddress?: string
  wifiUserId?: string
  voucherId?: string
  sessionMinutes: number
  speedLimitDown?: number
  speedLimitUp?: number
  ttlMinutes?: number
}

/**
 * Creates a short-lived, single-purpose token used to authenticate a guest via
 * RADIUS. The token is sent to the AP as both username and password; the AP
 * forwards it to FreeRADIUS, which validates it through our REST endpoint.
 */
export async function createRadiusToken(params: CreateRadiusTokenParams): Promise<string> {
  // Alphanumeric token, no symbols, so it survives URL encoding on the AP.
  const token = `t${nanoid(24).replace(/[^a-zA-Z0-9]/g, '')}`
  const ttl = params.ttlMinutes ?? DEFAULT_TTL_MINUTES

  await db.insert(radiusTokens).values({
    id: nanoid(),
    token,
    macAddress: params.macAddress ?? null,
    wifiUserId: params.wifiUserId ?? null,
    voucherId: params.voucherId ?? null,
    sessionMinutes: params.sessionMinutes,
    speedLimitDown: params.speedLimitDown ?? null,
    speedLimitUp: params.speedLimitUp ?? null,
    expiresAt: new Date(Date.now() + ttl * 60 * 1000),
    createdAt: new Date(),
  })

  return token
}

/**
 * Validates a token presented by FreeRADIUS. Returns the token row if it exists
 * and is still within its validity window, otherwise null. The token is marked
 * as used on first validation, but reuse within the validity window is allowed
 * (the AP may send more than one Access-Request).
 */
export async function validateRadiusToken(token: string) {
  if (!token) return null

  const rows = await db.select().from(radiusTokens).where(eq(radiusTokens.token, token))
  if (rows.length === 0) return null

  const row = rows[0]
  if (new Date(row.expiresAt) < new Date()) return null

  if (!row.used) {
    await db
      .update(radiusTokens)
      .set({ used: true, usedAt: new Date() })
      .where(eq(radiusTokens.id, row.id))
  }

  return row
}
