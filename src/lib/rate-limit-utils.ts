import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
}

/**
 * Generic rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : getDefaultKey(request)
    
    const now = Date.now()
    const record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null // Allow request
    }
    
    if (record.count >= config.maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(record.resetTime)
          }
        }
      )
    }
    
    record.count++
    return null // Allow request
  }
}

function getDefaultKey(request: NextRequest): string {
  // Use IP address and pathname as key
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const path = request.nextUrl.pathname
  return `${ip}:${path}`
}

// Cleanup old entries every minute
if (typeof global !== 'undefined' && typeof setInterval !== 'undefined') {
  if (!(global as any).__rateLimitCleanupStarted) {
    (global as any).__rateLimitCleanupStarted = true
    setInterval(() => {
      const now = Date.now()
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
          rateLimitStore.delete(key)
        }
      }
    }, 60 * 1000)
  }
}

// Pre-configured rate limiters
export const apiRateLimit = createRateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
})

export const strictRateLimit = createRateLimiter({
  maxRequests: 20, // 20 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
})

export const uploadRateLimit = createRateLimiter({
  maxRequests: 10, // 10 uploads
  windowMs: 60 * 60 * 1000, // per hour
})

