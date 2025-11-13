import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔐 Session check:', {
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      isSuperAdmin: session?.user?.isSuperAdmin
    })
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      console.log('❌ Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('✅ Authorized, fetching organizations...')

    // Get all organizations with detailed stats (including city field)
    // Get all organizations (status filter removed to include all, including those with null status)
    const orgs = await prisma.org.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        timezone: true,
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

    console.log(`📊 Found ${orgs.length} organizations in database`)

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

        // Get platform billing status (mock for now)
        const platformBilling = {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          city: org.city,
          timezone: org.timezone,
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

    console.log(`✅ Returning ${orgsWithStats.length} organizations`)
    return NextResponse.json(orgsWithStats)
  } catch (error: any) {
    console.error('❌ Error fetching org stats:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch organization stats', details: error.message },
      { status: 500 }
    )
  }
}

