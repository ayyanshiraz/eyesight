// src/lib/rateLimit.ts — lightweight in-memory rate limiter
// Buckets reset on cold start. Good enough for basic brute-force protection.

type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

/**
 * Returns true if the key is within limit, false if over limit.
 * @param key     e.g. "login:192.168.1.1" or "register:user@email.com"
 * @param limit   max attempts
 * @param windowMs window in ms (default 15 min)
 */
export function checkRateLimit(key: string, limit: number, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  bucket.count++
  if (bucket.count > limit) return false
  return true
}

export function getRemainingAttempts(key: string, limit: number): number {
  const bucket = store.get(key)
  if (!bucket || Date.now() > bucket.resetAt) return limit
  return Math.max(0, limit - bucket.count)
}
