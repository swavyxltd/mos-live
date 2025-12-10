import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Return current session data for debugging
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        isSuperAdmin: session.user.isSuperAdmin,
        roleHints: session.user.roleHints
      },
      message: 'Session refreshed. Please sign out and sign back in to get fresh roleHints.'
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to refresh session' },
      { status: 500 }
    )
  }
}

