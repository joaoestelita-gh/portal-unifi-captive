import { type NextRequest, NextResponse } from 'next/server'
import { validateRadiusToken } from '@/lib/radius'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * REST endpoint called by FreeRADIUS (rlm_rest) to authenticate a guest.
 *
 * Expected request (POST, JSON):
 *   { "username": "<token>", "password": "<token>", "secret": "<shared secret>" }
 *
 * The shared secret may also be sent in the "x-radius-secret" header.
 *
 * Responses:
 *   200 + JSON attributes  -> FreeRADIUS treats it as Access-Accept
 *   401                    -> FreeRADIUS treats it as Access-Reject
 *   403                    -> wrong/missing shared secret
 *
 * On accept we return Session-Timeout so the AP can enforce the session length.
 */
async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  // Support JSON, form-urlencoded and query string so the FreeRADIUS config can
  // be written in whichever style is easiest.
  const url = new URL(req.url)
  const fromQuery: Record<string, unknown> = {}
  url.searchParams.forEach((value, key) => {
    fromQuery[key] = value
  })

  const contentType = req.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      return { ...fromQuery, ...(await req.json()) }
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      const params = new URLSearchParams(text)
      const fromForm: Record<string, unknown> = {}
      params.forEach((value, key) => {
        fromForm[key] = value
      })
      return { ...fromQuery, ...fromForm }
    }
  } catch {
    // fall through to query-only
  }
  return fromQuery
}

async function handle(req: NextRequest) {
  const expectedSecret = process.env.RADIUS_REST_SECRET
  if (!expectedSecret) {
    console.error('[v0] RADIUS_REST_SECRET is not configured')
    return NextResponse.json({ error: 'server not configured' }, { status: 500 })
  }

  const payload = await readPayload(req)
  const providedSecret =
    req.headers.get('x-radius-secret') ||
    (typeof payload.secret === 'string' ? payload.secret : '')

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const username = typeof payload.username === 'string' ? payload.username.trim() : ''
  const token = await validateRadiusToken(username)

  if (!token) {
    // Access-Reject
    return NextResponse.json({ 'Reply-Message': 'invalid or expired token' }, { status: 401 })
  }

  // Access-Accept. Session-Timeout is in seconds. The op/value shape matches
  // what rlm_rest expects when parsing JSON reply attributes.
  return NextResponse.json(
    {
      'Session-Timeout': { op: ':=', value: token.sessionMinutes * 60 },
      'Acct-Interim-Interval': { op: ':=', value: 300 },
    },
    { status: 200 },
  )
}

export async function POST(req: NextRequest) {
  return handle(req)
}

// Some FreeRADIUS configs use GET with query params; support it too.
export async function GET(req: NextRequest) {
  return handle(req)
}
