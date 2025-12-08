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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Get demo org ID to exclude from counts
    const demoOrg = await prisma.org.findUnique({
      where: { slug: 'leicester-islamic-centre' },
      select: { id: true }
    })

    // Get total students for MRR (excluding demo org)
    const totalStudents = await prisma.student.count({
      where: { 
        isArchived: false,
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })

    const currentMRR = totalStudents * 1

    // Get last month's students (excluding demo org)
    const lastMonthStudents = await prisma.student.count({
      where: {
        createdAt: { lt: thisMonth },
        isArchived: false,
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })

    const lastMonthMRR = lastMonthStudents * 1
    const growth = lastMonthMRR > 0 ? ((currentMRR - lastMonthMRR) / lastMonthMRR) * 100 : 0

    const arr = currentMRR * 12

    // Get lifetime revenue (excluding demo org invoices)
    const allInvoices = await prisma.invoice.findMany({
      where: { 
        status: 'PAID',
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      },
      select: { amountP: true }
    })

    const lifetimeValue = allInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get average revenue per user (total users)
    const totalUsers = await prisma.user.count({
      where: { isArchived: false }
    })

    const averageRevenuePerUser = totalUsers > 0 ? lifetimeValue / totalUsers : 0

    // Growth metrics (excluding demo org)
    const newOrgsThisMonth = await prisma.org.count({
      where: {
        status: 'ACTIVE',
        createdAt: { gte: thisMonth },
        slug: { not: 'leicester-islamic-centre' }
      }
    })

    const newStudentsThisMonth = await prisma.student.count({
      where: {
        createdAt: { gte: thisMonth },
        isArchived: false,
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })

    const churnedOrgs = await prisma.org.count({
      where: {
        status: { not: 'ACTIVE' },
        updatedAt: { gte: thisMonth }
      }
    })

    const totalOrgs = await prisma.org.count({
      where: { 
        status: 'ACTIVE',
        slug: { not: 'leicester-islamic-centre' }
      }
    })

    const churnRate = totalOrgs > 0 ? (churnedOrgs / totalOrgs) * 100 : 0
    const retentionRate = 100 - churnRate

    // User analytics
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: thisMonth },
        isArchived: false
      }
    })

    const userGrowthRate = (totalUsers - newUsersThisMonth) > 0 
      ? (newUsersThisMonth / (totalUsers - newUsersThisMonth)) * 100 
      : 0

    // Geographic distribution (excluding demo org)
    const orgs = await prisma.org.findMany({
      where: { 
        status: 'ACTIVE',
        slug: { not: 'leicester-islamic-centre' }
      },
      select: {
        city: true,
        id: true,
        _count: {
          select: {
            students: { 
              where: { 
                isArchived: false,
                ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
              } 
            }
          }
        }
      }
    })

    // Group by city/region
    const geographyMap = new Map<string, { orgs: number; students: number; revenue: number }>()
    
    for (const org of orgs) {
      const region = org.city || 'Unknown'
      const existing = geographyMap.get(region) || { orgs: 0, students: 0, revenue: 0 }
      geographyMap.set(region, {
        orgs: existing.orgs + 1,
        students: existing.students + org._count.students,
        revenue: existing.revenue + org._count.students // Simplified
      })
    }

    const topRegions = Array.from(geographyMap.entries())
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 5)

    // Organisation size distribution
    const orgSizes = [
      { size: '1-10 students', count: 0, percentage: 0 },
      { size: '11-25 students', count: 0, percentage: 0 },
      { size: '26-50 students', count: 0, percentage: 0 },
      { size: '51-100 students', count: 0, percentage: 0 },
      { size: '100+ students', count: 0, percentage: 0 }
    ]

    for (const org of orgs) {
      const count = org._count.students
      if (count >= 1 && count <= 10) orgSizes[0].count++
      else if (count >= 11 && count <= 25) orgSizes[1].count++
      else if (count >= 26 && count <= 50) orgSizes[2].count++
      else if (count >= 51 && count <= 100) orgSizes[3].count++
      else if (count > 100) orgSizes[4].count++
    }

    const totalOrgsWithStudents = orgs.length
    orgSizes.forEach(size => {
      size.percentage = totalOrgsWithStudents > 0 ? Math.round((size.count / totalOrgsWithStudents) * 100) : 0
    })

    // Payment analytics (excluding demo org)
    const allInvoicesCount = await prisma.invoice.count({
      where: { ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) }
    })
    const paidInvoices = await prisma.invoice.count({
      where: { 
        status: 'PAID',
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })

    const successRate = allInvoicesCount > 0 ? (paidInvoices / allInvoicesCount) * 100 : 100

    // Revenue trend for last 12 months
    const revenueTrend = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidAt: {
            gte: monthStart,
            lte: monthEnd
          },
          ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
        },
        select: { amountP: true }
      })

      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
      
      // Calculate growth vs previous month
      const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
      const prevMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0)
      
      const prevMonthInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidAt: {
            gte: prevMonthStart,
            lte: prevMonthEnd
          },
          ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
        },
        select: { amountP: true }
      })

      const prevRevenue = prevMonthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
      const monthGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0

      revenueTrend.push({
        month: monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        revenue,
        growth: monthGrowth
      })
    }

    return NextResponse.json({
      revenue: {
        currentMRR,
        lastMonthMRR,
        growth,
        arr,
        lifetimeValue,
        averageRevenuePerUser
      },
      growth: {
        newOrgsThisMonth,
        newStudentsThisMonth,
        churnRate,
        retentionRate,
        // TODO: Implement expansion/contraction revenue tracking:
        // - expansionRevenue: Track when orgs upgrade plans or add more students
        // - contractionRevenue: Track when orgs downgrade or reduce students
        expansionRevenue: 0,
        contractionRevenue: 0
      },
      users: {
        totalActiveUsers: totalUsers,
        newUsersThisMonth,
        userGrowthRate,
        // TODO: Implement session tracking table to calculate:
        // - averageSessionDuration: Track user sessions with start/end times
        // - pageViewsPerSession: Track page views per session
        // - bounceRate: Calculate from single-page sessions
        averageSessionDuration: 0,
        pageViewsPerSession: 0,
        bounceRate: 0
      },
      geography: {
        topRegions
      },
      orgSizes,
      payments: {
        successRate,
        // TODO: Implement payment processing time tracking:
        // - averagePaymentTime: Track time from invoice creation to payment completion
        averagePaymentTime: 0,
        failedPayments: await prisma.invoice.count({ where: { status: 'OVERDUE' } }),
        // TODO: Implement refund and chargeback tracking:
        // - refunds: Track refunded invoices (add refund status/amount to Invoice model)
        // - chargebacks: Track chargeback events (add chargeback tracking table)
        refunds: 0,
        chargebacks: 0
      },
      revenueTrend
    })
  } catch (error: any) {
    logger.error('Error fetching analytics data', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

