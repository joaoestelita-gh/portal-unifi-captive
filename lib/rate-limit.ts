/**
 * Simple in-memory rate limiter for login/auth endpoints.
 * Tracks failed attempts per key (e.g. IP or email) using a sliding window.
 *
 * For production at scale, consider replacing with Redis-based solution
 * (e.g. @upstash/ratelimit) to work across serverless instances.
 */

interface RateLimitEntry {
  attempts: number
  firstAttempt: number
  blockedUntil: number | null
}

const store = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS = 5 // Max failed attempts before blocking
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes window
const BLOCK_DURATION_MS = 15 * 60 * 1000 // Block for 15 minutes after max attempts

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    const windowExpired = now - entry.firstAttempt > WINDOW_MS
    const blockExpired = entry.blockedUntil && now > entry.blockedUntil

    if (windowExpired && (!entry.blockedUntil || blockExpired)) {
      store.delete(key)
    }
  }
}

/**
 * Check if a key is currently rate limited.
 * Returns { limited: false } if allowed, or { limited: true, retryAfterSeconds } if blocked.
 */
export function checkRateLimit(key: string): { limited: boolean; retryAfterSeconds?: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry) return { limited: false }

  // Check if currently blocked
  if (entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000)
      return { limited: true, retryAfterSeconds }
    }
    // Block expired, reset
    store.delete(key)
    return { limited: false }
  }

  // Check if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.delete(key)
    return { limited: false }
  }

  // Check if max attempts reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS
    const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000)
    return { limited: true, retryAfterSeconds }
  }

  return { limited: false }
}

/**
 * Record a failed attempt for a key (e.g. after wrong password).
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { attempts: 1, firstAttempt: now, blockedUntil: null })
    return
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.set(key, { attempts: 1, firstAttempt: now, blockedUntil: null })
    return
  }

  entry.attempts++
}

/**
 * Clear rate limit for a key (e.g. after successful login).
 */
export function clearRateLimit(key: string): void {
  store.delete(key)
}
