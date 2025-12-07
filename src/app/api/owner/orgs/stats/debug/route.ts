import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Debug endpoint to check what's happening in production
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const debugInfo = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      isSuperAdmin: session?.user?.isSuperAdmin || false,
      cookies: request.headers.get('cookie') ? 'present' : 'missing',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    // Try to check database
    let dbCheck = { connected: false, orgCount: 0, error: null as string | null }
    try {
      const orgCount = await prisma.org.count()
      dbCheck = { connected: true, orgCount, error: null }
    } catch (dbError: any) {
      dbCheck = { connected: false, orgCount: 0, error: dbError?.message || 'Unknown error' }
    }

    // Check if user is super admin in DB
    let dbUserCheck = { found: false, isSuperAdmin: false, error: null as string | null }
    if (session?.user?.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { isSuperAdmin: true }
        })
        dbUserCheck = {
          found: !!dbUser,
          isSuperAdmin: dbUser?.isSuperAdmin || false,
          error: null
        }
      } catch (userError: any) {
        dbUserCheck = {
          found: false,
          isSuperAdmin: false,
          error: userError?.message || 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      ...debugInfo,
      database: dbCheck,
      dbUser: dbUserCheck
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

