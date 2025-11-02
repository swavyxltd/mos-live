import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get total organizations
    const totalOrgs = await prisma.org.count({
      where: { status: 'ACTIVE' }
    })

    // Get total students across all orgs
    const totalStudents = await prisma.student.count({
      where: { isArchived: false }
    })

    // Get total users (excluding archived)
    const totalUsers = await prisma.user.count({
      where: { isArchived: false }
    })

    // Get all organizations with stats
    const orgs = await prisma.org.findMany({
      where: { status: 'ACTIVE' },
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

    // Calculate MRR (Monthly Recurring Revenue) - sum of all active students * £1
    const mrr = totalStudents * 1
    const arr = mrr * 12

    // Get revenue data from invoices
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const lastMonthInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: lastMonth,
          lt: thisMonth
        }
      },
      select: { amount: true }
    })

    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: {
          gte: thisMonth
        }
      },
      select: { amount: true }
    })

    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Get overdue invoices
    const overdueCount = await prisma.invoice.count({
      where: {
        status: { in: ['OVERDUE', 'PENDING'] },
        dueDate: { lt: now }
      }
    })

    // Calculate payment success rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { status: true }
    })
    
    const totalRecent = recentInvoices.length
    const paidRecent = recentInvoices.filter(inv => inv.status === 'PAID').length
    const paymentSuccessRate = totalRecent > 0 ? (paidRecent / totalRecent) * 100 : 100

    // Get new orgs this month
    const newOrgsThisMonth = await prisma.org.count({
      where: {
        status: 'ACTIVE',
        createdAt: { gte: thisMonth }
      }
    })

    // Calculate churn rate (orgs that became inactive this month)
    const churnedOrgs = await prisma.org.count({
      where: {
        status: { not: 'ACTIVE' },
        updatedAt: { gte: thisMonth }
      }
    })
    const churnRate = totalOrgs > 0 ? (churnedOrgs / totalOrgs) * 100 : 0

    // Calculate average revenue per org
    const avgRevenuePerOrg = totalOrgs > 0 ? mrr / totalOrgs : 0

    // Get monthly revenue for last 12 months
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidDate: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        select: { amount: true }
      })
      
      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
      const monthStudents = await prisma.student.count({
        where: {
          createdAt: { lte: monthEnd },
          isArchived: false
        }
      })
      
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        revenue,
        students: monthStudents
      })
    }

    // Get top performing organizations (by student count)
    const topOrgs = await Promise.all(
      orgs
        .sort((a, b) => b._count.students - a._count.students)
        .slice(0, 5)
        .map(async (org) => {
          const orgInvoices = await prisma.invoice.findMany({
            where: {
              orgId: org.id,
              status: 'PAID',
              paidDate: { gte: lastMonth }
            },
            select: { amount: true }
          })
          
          const orgRevenue = orgInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
          const prevOrgRevenue = await prisma.invoice.findMany({
            where: {
              orgId: org.id,
              status: 'PAID',
              paidDate: {
                gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1),
                lt: lastMonth
              }
            },
            select: { amount: true }
          })
          
          const prevRevenue = prevOrgRevenue.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
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
    const recentPayments = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { paidDate: 'desc' },
      take: 5,
      include: {
        org: { select: { name: true } }
      }
    })

    const recentOrgs = await prisma.org.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const recentActivity = [
      ...recentPayments.map(payment => ({
        type: 'payment',
        message: `Payment received from ${payment.org.name}`,
        amount: Number(payment.amount || 0),
        time: `${Math.floor((now.getTime() - payment.paidDate.getTime()) / (60 * 60 * 1000))} hours ago`,
        status: 'success'
      })),
      ...recentOrgs.map(org => ({
        type: 'org',
        message: `New organization registered: ${org.name}`,
        time: `${Math.floor((now.getTime() - org.createdAt.getTime()) / (60 * 60 * 1000))} hours ago`,
        status: 'info'
      }))
    ].sort((a, b) => {
      const aHours = parseInt(a.time)
      const bHours = parseInt(b.time)
      return aHours - bHours
    }).slice(0, 5)

    // System health (mock data for now)
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
      churnRate,
      avgRevenuePerOrg,
      monthlyRevenue,
      topOrgs,
      recentActivity,
      systemHealth
    })
  } catch (error: any) {
    console.error('Error fetching owner dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    )
  }
}

