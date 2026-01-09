import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRateLimit } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

/**
 * API route to explicitly extend the session cookie with 30-day maxAge
 * This ensures the cookie persists across browser sessions
 */
async function handlePOST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get the current session token cookie
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('next-auth.session-token')?.value || 
                        cookieStore.get('__Secure-next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token found' },
        { status: 401 }
      )
    }

    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Session extended for 30 days'
    })

    // Explicitly set the session token cookie with 30-day maxAge
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    const thirtyDaysInSeconds = 30 * 24 * 60 * 60

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined,
      maxAge: thirtyDaysInSeconds, // 30 days in seconds - ensures cookie persists
    })

    return response
  } catch (error: any) {
    logger.error('Extend session error', error)
    return NextResponse.json(
      { error: 'Failed to extend session' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: false })
