import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { withRateLimit } from '@/lib/api-middleware'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

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

    // Verify this is a PWA request
    const isPWA = request.headers.get('x-pwa-mode') === 'true'
    
    if (!isPWA) {
      return NextResponse.json(
        { error: 'Not a PWA request' },
        { status: 400 }
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

    // Set a new session cookie with 90-day expiry
    // Note: We're extending the existing token, not creating a new one
    const response = NextResponse.json({ 
      success: true,
      message: 'Session extended for PWA (90 days)'
    })

    // Set the session token cookie with extended maxAge
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined,
      maxAge: 90 * 24 * 60 * 60, // 90 days in seconds
    })

    // Also set a flag cookie to indicate PWA mode
    response.cookies.set('pwa-mode', 'true', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined,
      maxAge: 90 * 24 * 60 * 60, // 90 days
    })

    return response
  } catch (error: any) {
    logger.error('Extend PWA session error', error)
    return NextResponse.json(
      { error: 'Failed to extend session' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: false })

