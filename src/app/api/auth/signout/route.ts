import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Custom signout endpoint that explicitly clears all NextAuth cookies
 * This ensures cookies are properly cleared in production/PWA environments
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated (optional check)
    const token = await getToken({ req: request })
    
    // Create response
    const response = NextResponse.json({ success: true })
    
    // Get all possible cookie names
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
    ]
    
    // Clear each cookie by setting it to empty with expired date
    cookieNames.forEach(cookieName => {
      // Set cookie to empty with expired date
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        expires: new Date(0), // Expired date
        maxAge: 0,
      })
      
      // Also try to delete it
      response.cookies.delete(cookieName)
    })
    
    return response
  } catch (error) {
    console.error('[SignOut] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sign out' },
      { status: 500 }
    )
  }
}

