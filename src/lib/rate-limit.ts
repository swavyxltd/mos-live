import { NextRequest } from 'next/server'
import rateLimit from 'next-rate-limit'

// Rate limiter for login attempts: 5 attempts per 15 minutes per IP
export const loginRateLimit = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500, // Max 500 unique IPs per interval
})

// Rate limiter for login attempts by email: 5 attempts per 15 minutes per email
const emailRateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkEmailRateLimit(email: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const record = emailRateLimitMap.get(email.toLowerCase())
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    emailRateLimitMap.set(email.toLowerCase(), {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs }
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: maxAttempts - record.count, resetTime: record.resetTime }
}

// Clean up old entries periodically (in production, use Redis or similar)
// Note: This is in-memory only. For production, use Redis or a proper rate limiting service
if (typeof global !== 'undefined' && typeof setInterval !== 'undefined') {
  // Only run cleanup in Node.js environment
  if (!(global as any).__rateLimitCleanupStarted) {
    (global as any).__rateLimitCleanupStarted = true
    setInterval(() => {
      const now = Date.now()
      for (const [email, record] of emailRateLimitMap.entries()) {
        if (now > record.resetTime) {
          emailRateLimitMap.delete(email)
        }
      }
    }, 60 * 1000) // Clean up every minute
  }
}

