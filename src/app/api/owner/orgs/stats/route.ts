import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      logger.warn('Unauthorized access attempt to owner orgs stats', {
        userId: session?.user?.id,
        isSuperAdmin: session?.user?.isSuperAdmin,
        hasSession: !!session,
        hasUser: !!session?.user
      })
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Owner access required' },
        { status: 401 }
      )
    }

    // Get all organizations, excluding demo ones
    let orgs
    try {
      logger.info('Fetching orgs from database')
      orgs = await prisma.org.findMany({
        where: {
          AND: [
            {
              slug: { 
                notIn: ['test-islamic-school', 'leicester-islamic-centre']
              }
            },
            {
              name: {
                not: {
                  contains: 'Test Islamic School',
                  mode: 'insensitive'
                }
              }
            },
            {
              name: {
                not: {
                  contains: 'Leicester Islamic Centre',
                  mode: 'insensitive'
                }
              }
            }
          ]
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
      
      // Additional client-side filter for safety
      orgs = orgs.filter(org => {
        const nameLower = org.name.toLowerCase()
        return (
          org.slug !== 'test-islamic-school' &&
          org.slug !== 'leicester-islamic-centre' &&
          !nameLower.includes('test islamic school') &&
          !nameLower.includes('leicester islamic centre')
        )
      })
      
      logger.info('Fetched orgs from database', { count: orgs.length })
    } catch (dbError: any) {
      logger.error('Error fetching orgs from database', dbError, {
        errorMessage: dbError?.message,
        errorCode: dbError?.code
      })
      throw dbError
    }

    // Handle empty orgs array
    if (!orgs || orgs.length === 0) {
      logger.info('No orgs found in database')
      return NextResponse.json([])
    }

    // Return basic org data with minimal stats
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
    
    logger.info('Returning orgs data', { count: basicOrgsResponse.length })
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
    } catch (promiseError: any) {
      logger.error('Error in Promise.all processing orgs', promiseError, {
        errorMessage: promiseError?.message,
        orgCount: orgs.length
      })
      // Instead of returning error, try to return basic org info
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
          logger.error(`Error serializing org ${index}`, orgError, { orgId: org?.id })
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
      logger.info('Returning orgs with stats', { count: serializableOrgs.length })
      return NextResponse.json(serializableOrgs)
    } catch (jsonError: any) {
      logger.error('JSON serialization error', jsonError, {
        errorMessage: jsonError?.message
      })
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

