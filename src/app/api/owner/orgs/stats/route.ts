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
        userId: session?.user?.id
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all organizations with detailed stats (including city field and status)
    // IMPORTANT: No where clause - this returns ALL orgs from database, no filtering
    // Get total count first for verification
    const totalOrgCount = await prisma.org.count()
    
    const orgs = await prisma.org.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        timezone: true,
        status: true, // Include status field
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            students: { where: { isArchived: false } },
            classes: { where: { isArchived: false } },
            memberships: true,
            invoices: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Verify we got all orgs
    if (orgs.length !== totalOrgCount) {
      logger.warn('Org count mismatch in findMany', {
        totalInDb: totalOrgCount,
        returnedByFindMany: orgs.length
      })
    }

    logger.info('Fetched orgs from database', { 
      count: orgs.length,
      totalInDb: totalOrgCount
    })

    // Get admin user for each org and calculate stats
    // Wrap each org processing in try-catch so one failing org doesn't break the entire list
    const orgsWithStats = await Promise.all(
      orgs.map(async (org) => {
        try {
          // Get admin user
          const adminMembership = await prisma.userOrgMembership.findFirst({
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

          // Get total revenue from paid invoices
          const invoices = await prisma.invoice.findMany({
            where: {
              orgId: org.id,
              status: 'PAID'
            },
            select: { amountP: true }
          })
          const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

          // Get last activity (most recent invoice or student update)
          const lastInvoice = await prisma.invoice.findFirst({
            where: { orgId: org.id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
          })

          const lastStudent = await prisma.student.findFirst({
            where: { orgId: org.id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
          })

          const lastActivity = lastInvoice && lastStudent
            ? lastInvoice.updatedAt > lastStudent.updatedAt ? lastInvoice.updatedAt : lastStudent.updatedAt
            : lastInvoice?.updatedAt || lastStudent?.updatedAt || org.updatedAt

          // Get teacher count
          const teacherCount = await prisma.userOrgMembership.count({
            where: {
              orgId: org.id,
              role: { in: ['STAFF', 'ADMIN'] }
            }
          })

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

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            city: org.city,
            timezone: org.timezone,
            status: org.status, // Include status in response
            createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
            updatedAt: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : org.updatedAt,
            _count: {
              students: org._count.students,
              classes: org._count.classes,
              memberships: org._count.memberships,
              invoices: org._count.invoices,
              teachers: teacherCount
            },
            platformBilling,
            owner: adminMembership?.user ? {
              name: adminMembership.user.name,
              email: adminMembership.user.email
            } : null,
            totalRevenue,
            lastActivity: lastActivity instanceof Date ? lastActivity.toISOString() : lastActivity
          }
        } catch (error: any) {
          logger.error('Error processing org stats', error, { orgId: org.id, orgName: org.name })
          // Return basic org info even if stats fail
          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            city: org.city,
            timezone: org.timezone,
            status: org.status,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
            _count: {
              students: org._count.students,
              classes: org._count.classes,
              memberships: org._count.memberships,
              invoices: org._count.invoices,
              teachers: 0
            },
            platformBilling: {
              stripeCustomerId: '',
              status: 'ACTIVE',
              currentPeriodEnd: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : (org.updatedAt || new Date().toISOString())
            },
            owner: null,
            totalRevenue: 0,
            lastActivity: org.updatedAt instanceof Date ? org.updatedAt.toISOString() : (org.updatedAt || new Date().toISOString())
          }
        }
      })
    )

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
    
    return NextResponse.json(orgsWithStats)
  } catch (error: any) {
    logger.error('Error fetching org stats', error, {
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization stats',
        ...(isDevelopment && { 
          details: error?.message,
          stack: error?.stack?.split('\n').slice(0, 5).join('\n')
        })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

