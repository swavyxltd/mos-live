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
    // Get all organizations (status filter removed to include all, including those with null status)
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


    // Get admin user for each org and calculate stats
    const orgsWithStats = await Promise.all(
      orgs.map(async (org) => {
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
          status: 'ACTIVE', // Would come from Stripe subscription status
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Would come from Stripe
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          city: org.city,
          timezone: org.timezone,
          status: org.status, // Include status in response
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
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
          lastActivity
        }
      })
    )

    return NextResponse.json(orgsWithStats)
  } catch (error: any) {
    logger.error('Error fetching org stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization stats',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

