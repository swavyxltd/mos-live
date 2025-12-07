import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  console.log('[Owner Orgs Stats] ========== HANDLER CALLED ==========')
  try {
    let session
    try {
      console.log('[Owner Orgs Stats] Getting session...')
      session = await getServerSession(authOptions)
      console.log('[Owner Orgs Stats] Session result:', {
        hasUser: !!session?.user,
        userId: session?.user?.id,
        isSuperAdmin: session?.user?.isSuperAdmin
      })
    } catch (sessionError: any) {
      console.error('[Owner Orgs Stats] Session error:', sessionError?.message, sessionError?.stack)
      logger.error('Error getting session', sessionError)
      return NextResponse.json(
        { error: 'Authentication error', message: sessionError?.message || 'Failed to get session' },
        { status: 500 }
      )
    }
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      logger.warn('Unauthorized access attempt to owner orgs stats', {
        userId: session?.user?.id,
        isSuperAdmin: session?.user?.isSuperAdmin
      })
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Owner access required' },
        { status: 401 }
      )
    }

    // Get all organizations with detailed stats (including city field and status)
    // IMPORTANT: No where clause - this returns ALL orgs from database, no filtering
    let orgs
    try {
      console.log('[Owner Orgs Stats] Fetching orgs from database...')
      logger.info('Starting to fetch orgs from database')
      // Simplified query - just get basic org data first
      // Exclude demo organizations
      orgs = await prisma.org.findMany({
        where: {
          slug: { 
            notIn: ['test-islamic-school', 'leicester-islamic-centre']
          }
        },
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
      
      // Filter out demo orgs by name as well (client-side filter for safety)
      orgs = orgs.filter(org => 
        !org.name.toLowerCase().includes('test islamic school') &&
        org.slug !== 'test-islamic-school' &&
        org.slug !== 'leicester-islamic-centre'
      )
      
      console.log('[Owner Orgs Stats] Fetched', orgs.length, 'orgs from database')
      logger.info('Fetched orgs from database', { count: orgs.length })
    } catch (dbError: any) {
      console.error('[Owner Orgs Stats] Database error:', dbError?.message, dbError?.code)
      logger.error('Error fetching orgs from database', dbError, {
        errorMessage: dbError?.message,
        errorCode: dbError?.code,
        errorName: dbError?.name,
        errorStack: dbError?.stack
      })
      throw dbError
    }

    // Handle empty orgs array
    if (!orgs || orgs.length === 0) {
      console.log('[Owner Orgs Stats] No orgs found in database')
      logger.info('No orgs found in database')
      return NextResponse.json([])
    }
    
    console.log('[Owner Orgs Stats] Processing', orgs.length, 'orgs')
    console.log('[Owner Orgs Stats] Org names:', orgs.map(o => o.name))

    // TEMPORARY: Return basic org data first to get it working
    // Then we'll add stats processing
    const basicOrgsResponse = orgs.map(org => ({
      id: String(org.id),
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
    
    console.log('[Owner Orgs Stats] ✅ Returning basic org data:', basicOrgsResponse.length, 'orgs')
    return NextResponse.json(basicOrgsResponse)

    // Get admin user for each org and calculate stats
    // Wrap each org processing in try-catch so one failing org doesn't break the entire list
    let orgsWithStats
    try {
      orgsWithStats = await Promise.all(
      orgs.map(async (org) => {
        try {
          // Get admin user - wrap in try-catch to handle potential errors
          let adminMembership = null
          try {
            adminMembership = await prisma.userOrgMembership.findFirst({
              where: {
                orgId: org.id,
                role: 'ADMIN'
              },
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            })
          } catch (adminError: any) {
            logger.error('Error fetching admin membership', adminError, { orgId: org.id })
            // Continue without admin info
          }

          // Get total revenue from paid invoices - wrap in try-catch
          let totalRevenue = 0
          try {
            const invoices = await prisma.invoice.findMany({
              where: {
                orgId: org.id,
                status: 'PAID'
              },
              select: { amountP: true }
            })
            totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
          } catch (invoiceError: any) {
            logger.error('Error fetching invoices', invoiceError, { orgId: org.id })
            // Continue with 0 revenue
          }

          // Get last activity (most recent invoice or student update) - wrap in try-catch
          let lastActivity = org.updatedAt
          try {
            const [lastInvoice, lastStudent] = await Promise.all([
              prisma.invoice.findFirst({
                where: { orgId: org.id },
                orderBy: { updatedAt: 'desc' },
                select: { updatedAt: true }
              }).catch(() => null),
              prisma.student.findFirst({
                where: { orgId: org.id },
                orderBy: { updatedAt: 'desc' },
                select: { updatedAt: true }
              }).catch(() => null)
            ])

            lastActivity = lastInvoice && lastStudent
              ? lastInvoice.updatedAt > lastStudent.updatedAt ? lastInvoice.updatedAt : lastStudent.updatedAt
              : lastInvoice?.updatedAt || lastStudent?.updatedAt || org.updatedAt
          } catch (activityError: any) {
            logger.error('Error fetching last activity', activityError, { orgId: org.id })
            // Use org.updatedAt as fallback
          }

          // Get teacher count - wrap in try-catch
          let teacherCount = 0
          try {
            teacherCount = await prisma.userOrgMembership.count({
              where: {
                orgId: org.id,
                role: { in: ['STAFF', 'ADMIN'] }
              }
            })
          } catch (teacherError: any) {
            logger.error('Error fetching teacher count', teacherError, { orgId: org.id })
            // Continue with 0 teachers
          }

          // Get platform billing status
          // TODO: Implement real platform billing status from Stripe:
          // - Query Stripe subscription status for org
          // - Get current period end from Stripe subscription
          // - Track billing status changes
          const platformBilling = {
            stripeCustomerId: '', // Would come from Stripe
            status: 'ACTIVE', // Would come from Stripe subscription status
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Would come from Stripe
          }

          // Ensure all values are serializable
          return {
            id: String(org.id),
            name: String(org.name || ''),
            slug: String(org.slug || ''),
            city: org.city ? String(org.city) : null,
            timezone: String(org.timezone || ''),
            status: String(org.status || 'ACTIVE'),
            createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
            updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString()),
            _count: {
              students: Number(org._count.students || 0),
              classes: Number(org._count.classes || 0),
              memberships: Number(org._count.memberships || 0),
              invoices: Number(org._count.invoices || 0),
              teachers: Number(teacherCount || 0)
            },
            platformBilling: {
              stripeCustomerId: String(platformBilling.stripeCustomerId || ''),
              status: String(platformBilling.status || 'ACTIVE'),
              currentPeriodEnd: String(platformBilling.currentPeriodEnd || new Date().toISOString())
            },
            owner: adminMembership?.user ? {
              name: String(adminMembership.user.name || ''),
              email: String(adminMembership.user.email || '')
            } : null,
            totalRevenue: Number(totalRevenue || 0),
            lastActivity: lastActivity instanceof Date ? lastActivity.toISOString() : String(lastActivity || new Date().toISOString())
          }
        } catch (error: any) {
          // Log error safely without potentially problematic serialization
          try {
            logger.error('Error processing org stats', error, { 
              orgId: org.id, 
              orgName: org.name,
              errorMessage: error?.message 
            })
          } catch (logError) {
            // If logging fails, just continue - don't break the response
            console.error('Error processing org stats for', org.id, error?.message)
          }
          // Return basic org info even if stats fail - ensure all values are serializable
          return {
            id: String(org.id),
            name: String(org.name || ''),
            slug: String(org.slug || ''),
            city: org.city ? String(org.city) : null,
            timezone: String(org.timezone || ''),
            status: String(org.status || 'ACTIVE'),
            createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
            updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString()),
            _count: {
              students: Number(org._count.students || 0),
              classes: Number(org._count.classes || 0),
              memberships: Number(org._count.memberships || 0),
              invoices: Number(org._count.invoices || 0),
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
          }
        }
      })
      )
      console.log('[Owner Orgs Stats] Promise.all completed, got', orgsWithStats?.length, 'orgs')
    } catch (promiseError: any) {
      console.error('[Owner Orgs Stats] Promise.all error:', promiseError?.message)
      console.error('[Owner Orgs Stats] Promise.all error stack:', promiseError?.stack)
      logger.error('Error in Promise.all processing orgs', promiseError, {
        errorMessage: promiseError?.message,
        errorStack: promiseError?.stack,
        orgCount: orgs.length
      })
      // Instead of returning error, try to return basic org info
      console.log('[Owner Orgs Stats] Attempting to return basic org info as fallback')
      const basicOrgs = orgs.map(org => ({
        id: String(org.id),
        name: String(org.name || ''),
        slug: String(org.slug || ''),
        city: org.city ? String(org.city) : null,
        timezone: String(org.timezone || ''),
        status: String(org.status || 'ACTIVE'),
        createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
        updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString()),
        _count: {
          students: Number(org._count.students || 0),
          classes: Number(org._count.classes || 0),
          memberships: Number(org._count.memberships || 0),
          invoices: Number(org._count.invoices || 0),
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
      return NextResponse.json(basicOrgs)
    }

    // Ensure we have a valid array
    if (!Array.isArray(orgsWithStats)) {
      logger.error('orgsWithStats is not an array', { type: typeof orgsWithStats })
      return NextResponse.json([])
    }

    logger.info('Returning orgs with stats', { 
      count: orgsWithStats.length
    })
    
    // Verify we're returning all orgs
    if (orgs.length !== orgsWithStats.length) {
      logger.warn('Org count mismatch', {
        fetchedFromDb: orgs.length,
        returnedWithStats: orgsWithStats.length
      })
    }
    
    try {
      console.log('[Owner Orgs Stats] Serializing response with', orgsWithStats.length, 'orgs')
      if (orgsWithStats && orgsWithStats.length > 0) {
        console.log('[Owner Orgs Stats] First org sample:', JSON.stringify(orgsWithStats[0], null, 2))
      } else {
        console.log('[Owner Orgs Stats] WARNING: orgsWithStats is empty or undefined!')
      }
      // Ensure all values are serializable
      const serializableOrgs = orgsWithStats.map((org, index) => {
        try {
        return {
          id: String(org.id),
          name: String(org.name || ''),
          slug: String(org.slug || ''),
          city: org.city ? String(org.city) : null,
          timezone: String(org.timezone || ''),
          status: String(org.status || 'ACTIVE'),
          createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
          updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString()),
          _count: {
            students: Number(org._count?.students || 0),
            classes: Number(org._count?.classes || 0),
            memberships: Number(org._count?.memberships || 0),
            invoices: Number(org._count?.invoices || 0),
            teachers: Number(org._count?.teachers || 0)
          },
          platformBilling: {
            stripeCustomerId: String(org.platformBilling?.stripeCustomerId || ''),
            status: String(org.platformBilling?.status || 'ACTIVE'),
            currentPeriodEnd: String(org.platformBilling?.currentPeriodEnd || new Date().toISOString())
          },
          owner: org.owner ? {
            name: String(org.owner.name || ''),
            email: String(org.owner.email || '')
          } : null,
          totalRevenue: Number(org.totalRevenue || 0),
          lastActivity: org.lastActivity instanceof Date ? org.lastActivity.toISOString() : String(org.lastActivity || new Date().toISOString())
        }
        } catch (orgError: any) {
          console.error(`[Owner Orgs Stats] Error serializing org ${index}:`, orgError?.message)
          // Return minimal org info if serialization fails
          return {
            id: String(org?.id || ''),
            name: String(org?.name || 'Unknown'),
            slug: String(org?.slug || ''),
            city: null,
            timezone: '',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: { students: 0, classes: 0, memberships: 0, invoices: 0, teachers: 0 },
            platformBilling: { stripeCustomerId: '', status: 'ACTIVE', currentPeriodEnd: new Date().toISOString() },
            owner: null,
            totalRevenue: 0,
            lastActivity: new Date().toISOString()
          }
        }
      })
      console.log('[Owner Orgs Stats] ✅ Successfully serialized', serializableOrgs.length, 'orgs')
      console.log('[Owner Orgs Stats] ✅ Returning response with', serializableOrgs.length, 'orgs')
      const response = NextResponse.json(serializableOrgs)
      console.log('[Owner Orgs Stats] ✅ Response created, status:', response.status)
      console.log('[Owner Orgs Stats] ========== SUCCESS ==========')
      return response
    } catch (jsonError: any) {
      console.error('[Owner Orgs Stats] JSON serialization error:', jsonError?.message, jsonError?.stack)
      logger.error('Error serializing response to JSON', jsonError, {
        orgCount: orgsWithStats.length,
        errorMessage: jsonError?.message
      })
      // Try to return at least basic org info
      const basicOrgs = orgs.map(org => ({
        id: String(org.id),
        name: String(org.name || ''),
        slug: String(org.slug || ''),
        city: org.city ? String(org.city) : null,
        status: String(org.status || 'ACTIVE'),
        createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : String(org.createdAt || new Date().toISOString()),
        updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : String(org.updatedAt || new Date().toISOString())
      }))
      return NextResponse.json(basicOrgs)
    }
  } catch (error: any) {
    // Log the full error for debugging
    console.error('[Owner Orgs Stats] ========== ERROR CAUGHT ==========')
    console.error('[Owner Orgs Stats] Error message:', error?.message)
    console.error('[Owner Orgs Stats] Error name:', error?.name)
    console.error('[Owner Orgs Stats] Error code:', error?.code)
    console.error('[Owner Orgs Stats] Error stack:', error?.stack)
    console.error('[Owner Orgs Stats] Full error object:', error)
    logger.error('Error fetching org stats', error, {
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
      errorCode: error?.code
    })
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Ensure we always return a valid JSON response
    try {
      return NextResponse.json(
        { 
          error: 'Failed to fetch organization stats',
          message: error?.message || 'Unknown error',
          ...(isDevelopment && { 
            details: error?.message,
            stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
            code: error?.code
          })
        },
        { status: 500 }
      )
    } catch (jsonError) {
      // If even JSON serialization fails, return a plain text response
      console.error('[Owner Orgs Stats] Failed to serialize error response:', jsonError)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to fetch organization stats',
          message: 'Internal server error'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export const GET = withRateLimit(handleGET)

