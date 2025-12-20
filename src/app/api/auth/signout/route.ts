import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Custom signout endpoint that explicitly clears all NextAuth cookies
 * This ensures cookies are properly cleared in production/PWA environments
 * Handles both GET (for NextAuth redirects) and POST requests
 */
async function handleSignOut(request: NextRequest, callbackUrl?: string) {
  // Get callback URL from query params or default
  const url = new URL(request.url)
  const redirectUrl = callbackUrl || url.searchParams.get('callbackUrl') || '/auth/signin?loggedOut=true'
  
  // Create redirect response
  const response = NextResponse.redirect(new URL(redirectUrl, request.url))
  
  // Get all possible cookie names (including variations for different environments)
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.session-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
    '__Host-next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
  ]
  
  // Clear each cookie by setting it to empty with expired date
  // We need to try both secure and non-secure versions, and different paths
  cookieNames.forEach(cookieName => {
    // Try to delete the cookie first
    response.cookies.delete(cookieName)
    
    // Set cookie to empty with expired date (multiple variations to ensure it's cleared)
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      expires: new Date(0), // Expired date
      maxAge: 0,
    }
    
    // Set with secure flag for production
    response.cookies.set(cookieName, '', {
      ...cookieOptions,
      secure: true,
    })
    
    // Also set without secure flag (for development/localhost)
    response.cookies.set(cookieName, '', {
      ...cookieOptions,
      secure: false,
    })
    
    // Try with domain explicitly set (some browsers need this)
    if (process.env.NODE_ENV === 'production') {
      response.cookies.set(cookieName, '', {
        ...cookieOptions,
        secure: true,
        domain: '.madrasah.io', // Try with domain
      })
    }
  })
  
  return response
}

export async function GET(request: NextRequest) {
  try {
    return await handleSignOut(request)
  } catch (error) {
    console.error('[SignOut] Error:', error)
    // Still redirect even on error
    return NextResponse.redirect(new URL('/auth/signin?loggedOut=true', request.url))
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    return await handleSignOut(request, body.callbackUrl)
  } catch (error) {
    console.error('[SignOut] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sign out' },
      { status: 500 }
    )
  }
}

