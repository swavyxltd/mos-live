import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    // Get session - in production, we need to ensure cookies are properly read
    let session
    try {
      session = await getServerSession(authOptions)
    } catch (sessionError: any) {
      logger.error('Error getting session', sessionError, {
        errorMessage: sessionError?.message,
        url: request.url
      })
      return NextResponse.json(
        { error: 'Session error', message: 'Failed to authenticate' },
        { status: 401 }
      )
    }
    
    // Only allow super admins (owners)
    if (!session?.user?.id) {
      logger.warn('Unauthorized access attempt - no session', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        url: request.url,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      })
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Authentication required',
          debug: process.env.NODE_ENV === 'development' ? {
            hasSession: !!session,
            hasUser: !!session?.user,
            cookiesPresent: !!request.headers.get('cookie')
          } : undefined
        },
        { status: 401 }
      )
    }

    // Check if user is super admin - fetch fresh from DB to be sure
    let isSuperAdmin = Boolean(session.user.isSuperAdmin)
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isSuperAdmin: true }
      })
      if (dbUser !== null) {
        isSuperAdmin = Boolean(dbUser.isSuperAdmin)
      }
    } catch (dbError: any) {
      logger.error('Error checking isSuperAdmin from DB', dbError, {
        userId: session.user.id,
        errorMessage: dbError?.message
      })
      // Fall back to session value
    }

    if (!isSuperAdmin) {
      logger.warn('Unauthorized access attempt - not super admin', {
        userId: session.user.id,
        sessionIsSuperAdmin: session.user.isSuperAdmin,
        dbIsSuperAdmin: isSuperAdmin
      })
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Owner access required' },
        { status: 401 }
      )
    }

    // Get all organizations - show everything including demo orgs
    let orgs
    try {
      logger.info('Fetching all orgs from database', { 
        userId: session.user.id,
        isSuperAdmin: isSuperAdmin,
        environment: process.env.NODE_ENV
      })
      
      // Direct database query - no filters, no conditions
      // This should return ALL orgs in the database
      orgs = await prisma.org.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          timezone: true,
          status: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      // Log detailed info for debugging
      logger.info('Fetched orgs from database', { 
        count: orgs.length, 
        userId: session.user.id,
        orgIds: orgs.map(o => o.id).slice(0, 5), // Log first 5 IDs for debugging
        orgNames: orgs.map(o => o.name).slice(0, 5) // Log first 5 names
      })
      
      // If orgs is null or undefined, set to empty array
      if (!orgs) {
        logger.warn('orgs is null/undefined, setting to empty array')
        orgs = []
      }
    } catch (dbError: any) {
      logger.error('Error fetching orgs from database', dbError, {
        errorMessage: dbError?.message,
        errorCode: dbError?.code,
        userId: session.user.id
      })
      // Return error response instead of throwing
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: 'Failed to fetch organizations',
          ...(process.env.NODE_ENV === 'development' && { details: dbError?.message })
        },
        { status: 500 }
      )
    }

    // Handle empty orgs array
    if (!orgs || orgs.length === 0) {
      logger.info('No orgs found in database', { userId: session.user.id })
      return NextResponse.json([])
    }

    // Return basic org data with minimal stats
    try {
      const basicOrgsResponse = orgs.map(org => ({
        id: String(org.id || ''),
        name: String(org.name || ''),
        slug: String(org.slug || ''),
        city: org.city ? String(org.city) : null,
        timezone: String(org.timezone || ''),
        status: String(org.status || 'ACTIVE'),
        createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
        updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString()),
        _count: {
          students: 0,
          classes: 0,
          memberships: 0,
          invoices: 0,
          teachers: 0
        },
        platformBilling: {
          stripeCustomerId: '',
          status: 'ACTIVE',
          currentPeriodEnd: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString())
        },
        owner: null,
        totalRevenue: 0,
        lastActivity: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString())
      }))
      
      logger.info('Returning orgs data', { 
        count: basicOrgsResponse.length, 
        userId: session.user.id,
        firstOrgName: basicOrgsResponse[0]?.name || 'none'
      })
      
      // Return with explicit CORS and cache headers for production
      return NextResponse.json(basicOrgsResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    } catch (mapError: any) {
      logger.error('Error mapping orgs response', mapError, {
        errorMessage: mapError?.message,
        orgCount: orgs.length
      })
      return NextResponse.json(
        { 
          error: 'Serialization error', 
          message: 'Failed to format organizations data',
          ...(process.env.NODE_ENV === 'development' && { details: mapError?.message })
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error fetching org stats', error, {
      errorMessage: error?.message,
      errorStack: error?.stack
    })
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Ensure we always return a valid JSON response
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization stats',
        message: error?.message || 'Unknown error',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

