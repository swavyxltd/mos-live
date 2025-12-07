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
      // Log the error immediately to console for debugging
      console.error('[API Middleware] Error caught:', {
        path: request.nextUrl.pathname,
        method: request.method,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack?.split('\n').slice(0, 3).join('\n'),
        errorString: String(error)
      })
      
      const { logger } = await import('./logger')
      logger.error('API route error', error, {
        path: request.nextUrl.pathname,
        method: request.method
      })

      // Don't expose error details in production
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      // Ensure we always return valid JSON
      try {
        return NextResponse.json(
          { 
            error: 'Internal server error',
            message: error?.message || 'An unexpected error occurred',
            ...(isDevelopment && { 
              details: error?.message,
              stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
              name: error?.name
            })
          },
          { status: 500 }
        )
      } catch (jsonError) {
        // If JSON serialization fails, return plain text
        console.error('[API Middleware] Failed to serialize error response:', jsonError)
        return new NextResponse(
          JSON.stringify({ 
            error: 'Internal server error',
            message: 'Failed to serialize error response'
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }
}

