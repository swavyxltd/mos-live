import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimit, strictRateLimit, uploadRateLimit } from './rate-limit-utils'

/**
 * API middleware wrapper that adds rate limiting and error handling
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options?: { strict?: boolean; upload?: boolean }
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Apply rate limiting
      const rateLimiter = options?.upload 
        ? uploadRateLimit 
        : options?.strict 
        ? strictRateLimit 
        : apiRateLimit

      const rateLimitResult = await rateLimiter(request)
      if (rateLimitResult) {
        return rateLimitResult
      }

      // Call the actual handler
      return await handler(request, ...args)
    } catch (error: any) {
      const { logger } = await import('./logger')
      logger.error('API route error', error, {
        path: request.nextUrl.pathname,
        method: request.method
      })

      // Don't expose error details in production
      const isDevelopment = process.env.NODE_ENV === 'development'
      return NextResponse.json(
        { 
          error: 'Internal server error',
          ...(isDevelopment && { details: error?.message })
        },
        { status: 500 }
      )
    }
  }
}

