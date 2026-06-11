import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { wifiUsers, wifiSessions } from '@/lib/db/schema'
import { eq, lt, and, sql } from 'drizzle-orm'
import { getUnifiClient } from '@/lib/unifi'
import { getArubaClient } from '@/lib/aruba'

// Helper to get controller settings
async function getControllerSettings() {
  const { portalSettings } = await import('@/lib/db/schema')
  const settings = await db.select().from(portalSettings).where(eq(portalSettings.id, 'default'))
  return settings[0] || null
}

// Helper to unauthorize on controller
async function unauthorizeOnController(macAddress: string, settings: {
  controllerType?: string | null
  unifiControllerUrl?: string | null
  unifiUsername?: string | null
  unifiPassword?: string | null
  unifiSite?: string | null
  arubaControllerUrl?: string | null
  arubaClientId?: string | null
  arubaClientSecret?: string | null
}) {
  if (settings.controllerType === 'unifi') {
    if (!settings.unifiControllerUrl || !settings.unifiUsername || !settings.unifiPassword) {
      return
    }
    try {
      const unifi = getUnifiClient({
        controllerUrl: settings.unifiControllerUrl,
        username: settings.unifiUsername,
        password: settings.unifiPassword,
        site: settings.unifiSite || 'default',
      })
      await unifi.unauthorizeGuest(macAddress)
    } catch (error) {
      console.error('UniFi unauthorize error:', error)
    }
  }
  
  if (settings.controllerType === 'aruba') {
    if (!settings.arubaControllerUrl || !settings.arubaClientId || !settings.arubaClientSecret) {
      return
    }
    try {
      const aruba = getArubaClient({
        baseUrl: settings.arubaControllerUrl,
        clientId: settings.arubaClientId,
        clientSecret: settings.arubaClientSecret,
      })
      await aruba.unauthorizeGuest(macAddress)
    } catch (error) {
      console.error('Aruba unauthorize error:', error)
    }
  }
}

// This endpoint handles:
// 1. Ending expired sessions
// 2. Resetting daily usage counters
// 
// Call this from a cron job every minute or use Vercel Cron
// Example vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/sessions",
//     "schedule": "* * * * *"
//   }]
// }

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Allow if no CRON_SECRET is set (for testing) or if the header matches
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
    
    // 1. End expired sessions
    const now = new Date()
    const expiredSessions = await db
      .select()
      .from(wifiSessions)
      .where(
        and(
          eq(wifiSessions.status, 'active'),
          lt(wifiSessions.expectedEndTime, now)
        )
      )

    for (const session of expiredSessions) {
      try {
        const endTime = new Date()
        const duration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / 60000)
        
        // Unauthorize on controller
        if (settings) {
          await unauthorizeOnController(session.macAddress, settings)
        }

        // Update session
        await db.update(wifiSessions).set({
          status: 'expired',
          endTime,
          duration,
        }).where(eq(wifiSessions.id, session.id))

        // Update user's daily usage
        if (session.wifiUserId) {
          await db.update(wifiUsers).set({
            totalTimeUsedToday: sql`"totalTimeUsedToday" + ${duration}`,
            updatedAt: new Date(),
          }).where(eq(wifiUsers.id, session.wifiUserId))
        }

        results.expiredSessions++
      } catch (error) {
        results.errors.push(`Failed to end session ${session.id}: ${error}`)
      }
    }

    // 2. Reset daily usage for users where lastResetDate is not today
    const today = new Date().toISOString().split('T')[0]
    const usersToReset = await db
      .select()
      .from(wifiUsers)
      .where(sql`"lastResetDate" < ${today}::date OR "lastResetDate" IS NULL`)

    for (const user of usersToReset) {
      try {
        await db.update(wifiUsers).set({
          totalTimeUsedToday: 0,
          lastResetDate: sql`CURRENT_DATE`,
          updatedAt: new Date(),
        }).where(eq(wifiUsers.id, user.id))
        
        results.resetUsers++
      } catch (error) {
        results.errors.push(`Failed to reset user ${user.id}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.expiredSessions} expired sessions, reset ${results.resetUsers} users`,
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
