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

    // Get demo org ID first (needed for filtering)
    const demoOrg = await prisma.org.findUnique({
      where: { slug: 'leicester-islamic-centre' },
      select: { id: true }
    })

    // Parallelize all count queries
    const [
      totalOrgs,
      totalStudents,
      totalUsers
    ] = await Promise.all([
      prisma.org.count({
        where: { 
          status: 'ACTIVE',
          slug: { not: 'leicester-islamic-centre' } // Exclude demo org
        }
      }),
      prisma.student.count({
        where: { 
          isArchived: false,
          ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) // Exclude demo org students
        }
      }),
      prisma.user.count({
        where: { isArchived: false }
      })
    ])

    // Get all organisations with stats (excluding demo org) - can run in parallel with revenue queries
    const orgs = await prisma.org.findMany({
        where: { 
          status: 'ACTIVE',
          slug: { not: 'leicester-islamic-centre' } // Exclude demo org
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          _count: {
            select: {
              students: { where: { isArchived: false } },
              classes: { where: { isArchived: false } },
              memberships: true,
              invoices: true
            }
          }
        }
      })

    // Calculate MRR (Monthly Recurring Revenue) - sum of all active students * £2
    const mrr = totalStudents * 2
    const arr = mrr * 12

    // Get revenue data from invoices using database aggregation
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Use database aggregation for revenue calculations (much faster)
    const [lastMonthRevenueResult, thisMonthRevenueResult] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: lastMonth,
            lt: thisMonth
          }
        },
        _sum: { amountP: true }
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: thisMonth
          }
        },
        _sum: { amountP: true }
      })
    ])

    const lastMonthRevenue = Number(lastMonthRevenueResult._sum.amountP || 0) / 100
    const thisMonthRevenue = Number(thisMonthRevenueResult._sum.amountP || 0) / 100
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Parallelize all remaining count queries
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const [
      overdueCount,
      totalRecent,
      paidRecent,
      newOrgsThisMonth,
      totalLeads
    ] = await Promise.all([
      prisma.invoice.count({
        where: {
          status: { in: ['OVERDUE', 'PENDING'] },
          dueDate: { lt: now }
        }
      }),
      prisma.invoice.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.invoice.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'PAID'
        }
      }),
      prisma.org.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: thisMonth },
          slug: { not: 'leicester-islamic-centre' } // Exclude demo org
        }
      }),
      prisma.lead.count({
        where: {
          status: { notIn: ['WON', 'LOST'] } // Active leads (excluding won/lost)
        }
      })
    ])
    
    const paymentSuccessRate = totalRecent > 0 ? (paidRecent / totalRecent) * 100 : 100

    // Calculate average revenue per org
    const avgRevenuePerOrg = totalOrgs > 0 ? mrr / totalOrgs : 0

    // Get monthly revenue for last 12 months - PARALLELIZED for speed
    const monthlyRevenuePromises = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      monthlyRevenuePromises.push(
        Promise.all([
          // Use database aggregation instead of fetching all invoices
          prisma.invoice.aggregate({
            where: {
              status: 'PAID',
              paidAt: {
                gte: monthStart,
                lte: monthEnd
              }
            },
            _sum: { amountP: true }
          }),
          prisma.student.count({
            where: {
              createdAt: { lte: monthEnd },
              isArchived: false,
              ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) // Exclude demo org students
            }
          })
        ]).then(([revenueResult, monthStudents]) => ({
          month: monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          revenue: Number(revenueResult._sum.amountP || 0) / 100,
          students: monthStudents
        }))
      )
    }
    
    const monthlyRevenue = await Promise.all(monthlyRevenuePromises)

    // Get top performing organisations (by student count) - optimized with parallel aggregations
    const top5Orgs = orgs
      .sort((a, b) => b._count.students - a._count.students)
      .slice(0, 5)
    
    const topOrgs = await Promise.all(
      top5Orgs.map(async (org) => {
        const prevMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)
        
        // Use database aggregations instead of fetching all invoices
        const [orgRevenueResult, prevOrgRevenueResult] = await Promise.all([
          prisma.invoice.aggregate({
            where: {
              orgId: org.id,
              status: 'PAID',
              paidAt: { gte: lastMonth }
            },
            _sum: { amountP: true }
          }),
          prisma.invoice.aggregate({
            where: {
              orgId: org.id,
              status: 'PAID',
              paidAt: {
                gte: prevMonthStart,
                lt: lastMonth
              }
            },
            _sum: { amountP: true }
          })
        ])
        
        const orgRevenue = Number(orgRevenueResult._sum.amountP || 0) / 100
        const prevRevenue = Number(prevOrgRevenueResult._sum.amountP || 0) / 100
        const growth = prevRevenue > 0 ? ((orgRevenue - prevRevenue) / prevRevenue) * 100 : 0
        
        return {
          name: org.name,
          students: org._count.students,
          revenue: orgRevenue,
          growth,
          status: 'active'
        }
      })
    )

    // Get recent activity (payments and orgs)
    const allRecentPayments = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { not: null }
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
      include: {
        org: { select: { name: true } }
      }
    })
    
    const recentPayments = allRecentPayments
      .filter(payment => payment.paidAt && payment.paidAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000))
      .slice(0, 5)

    const recentOrgs = await prisma.org.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const recentActivity = [
      ...recentPayments
        .filter(payment => payment.paidAt) // Only include payments with paidAt
        .map(payment => ({
          type: 'payment',
          message: `Payment received from ${payment.org.name}`,
          amount: Number(payment.amountP || 0) / 100,
          time: payment.paidAt 
            ? `${Math.floor((now.getTime() - payment.paidAt.getTime()) / (60 * 60 * 1000))} hours ago`
            : 'Recently',
          status: 'success'
        })),
      ...recentOrgs.map(org => ({
        type: 'org',
        message: `New organisation registered: ${org.name}`,
        time: `${Math.floor((now.getTime() - org.createdAt.getTime()) / (60 * 60 * 1000))} hours ago`,
        status: 'info'
      }))
    ].sort((a, b) => {
      const aHours = parseInt(a.time) || 0
      const bHours = parseInt(b.time) || 0
      return aHours - bHours
    }).slice(0, 5)

    // System health - fetch from system health API
    // We'll fetch this on the client side to get live data
    const systemHealth = {
      uptime: 99.9,
      responseTime: 150,
      errorRate: 0.02,
      activeUsers: totalUsers
    }

    return NextResponse.json({
      totalOrgs,
      totalStudents,
      totalUsers,
      mrr,
      arr,
      lastMonthRevenue,
      thisMonthRevenue,
      revenueGrowth,
      overdueCount,
      paymentSuccessRate,
      newOrgsThisMonth,
      totalLeads,
      avgRevenuePerOrg,
      monthlyRevenue,
      topOrgs,
      recentActivity,
      systemHealth
    })
  } catch (error: any) {
    logger.error('Error fetching owner dashboard data', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

