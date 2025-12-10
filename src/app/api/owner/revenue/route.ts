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

    // Get demo org ID to exclude from counts
    const demoOrg = await prisma.org.findUnique({
      where: { slug: 'leicester-islamic-centre' },
      select: { id: true }
    })

    // Get total students for MRR calculation (excluding demo org)
    const totalStudents = await prisma.student.count({
      where: { 
        isArchived: false,
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Calculate MRR (Monthly Recurring Revenue) - sum of all active students * £1
    const mrr = totalStudents * 1
    
    // Calculate last month's MRR for growth calculation
    const lastMonthStudents = await prisma.student.count({
      where: { 
        isArchived: false,
        createdAt: { lt: thisMonth },
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      }
    })
    const lastMonthMRR = lastMonthStudents * 1
    const mrrGrowth = lastMonthMRR > 0 ? ((mrr - lastMonthMRR) / lastMonthMRR) * 100 : 0
    
    const arr = mrr * 12

    // Get revenue from paid invoices (only those with paidAt set and in this month, excluding demo org)
    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          not: null,
          gte: thisMonth
        },
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      },
      select: { amountP: true }
    })

    const allTimeInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      },
      select: { amountP: true }
    })

    const thisMonthCollected = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
    const totalRevenue = allTimeInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get pending invoices (excluding demo org)
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now },
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      },
      select: { amountP: true }
    })

    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get failed payments (invoices with failed status or overdue, excluding demo org)
    const failedInvoices = await prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: { lt: now },
        ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
      },
      select: { amountP: true }
    })

    const failedPayments = failedInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Calculate breakdown
    const subscriptionRevenue = mrr
    // TODO: Implement one-time payment tracking:
    // - Add invoice type field (SUBSCRIPTION, ONE_TIME) to Invoice model
    // - Calculate oneTimePayments from invoices with type='ONE_TIME'
    const oneTimePayments = 0
    // TODO: Implement refund tracking:
    // - Add refund status/amount fields to Invoice model or create Refund table
    // - Calculate refunds from refunded invoices
    const refunds = 0
    // TODO: Implement chargeback tracking:
    // - Create Chargeback table or add chargeback fields to Invoice
    // - Track chargeback events from Stripe webhooks
    const chargebacks = 0
    const netRevenue = thisMonthCollected - refunds - chargebacks

    // Get payment status counts (excluding demo org)
    const allInvoices = await prisma.invoice.findMany({
      where: { ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) },
      select: { status: true }
    })

    const successful = allInvoices.filter(inv => inv.status === 'PAID').length
    const pending = allInvoices.filter(inv => inv.status === 'PENDING').length
    const failed = allInvoices.filter(inv => inv.status === 'OVERDUE').length
    // TODO: Implement refund status tracking:
    // - Add refund status field to Invoice model or query Refund table
    // - Count invoices with refund status
    const refunded = 0
    const totalPayments = allInvoices.length
    const successRate = totalPayments > 0 ? (successful / totalPayments) * 100 : 100

    // Get failed payments with org details for retry
    let failedPaymentsList: any[] = []
    try {
      failedPaymentsList = await prisma.invoice.findMany({
        where: {
          status: 'OVERDUE',
          dueDate: { lt: now },
          ...(demoOrg ? { orgId: { not: demoOrg.id } } : {})
        },
        include: {
          Org: { select: { name: true } },
          Student: { select: { firstName: true, lastName: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })
    } catch (error) {
      logger.error('Error fetching failed payments', error)
      // Continue with empty array
    }

    const failedPaymentsFormatted = failedPaymentsList.map((inv: any) => ({
      id: inv.id,
      orgName: inv.Org?.name || 'Unknown Org',
      studentName: inv.Student ? `${inv.Student.firstName} ${inv.Student.lastName}` : 'Unknown Student',
      amount: Number(inv.amountP || 0) / 100,
      failureDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      reason: 'Payment overdue',
      retryCount: 0,
      nextRetry: null,
      status: 'overdue',
      stripePaymentIntentId: null,
      organisationId: inv.orgId
    }))

    // Get top revenue generators (orgs by student count, excluding demo org)
    const orgs = await prisma.org.findMany({
      where: { 
        status: 'ACTIVE',
        slug: { not: 'leicester-islamic-centre' }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: { where: { isArchived: false } }
          }
        }
      },
      orderBy: {
        _count: {
          students: 'desc'
        }
      },
      take: 5
    })

    const topRevenueGenerators = await Promise.all(
      orgs.map(async (org) => {
        const orgInvoices = await prisma.invoice.findMany({
          where: {
            orgId: org.id,
            status: 'PAID',
            paidAt: {
              not: null,
              gte: lastMonth
            },
            ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) // Redundant but safe
          },
          select: { amountP: true }
        })

        const monthlyRevenue = orgInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
        
        // Get previous month revenue for growth calculation
        const prevMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1)
        const prevOrgInvoices = await prisma.invoice.findMany({
          where: {
            orgId: org.id,
            status: 'PAID',
            paidAt: {
              not: null,
              gte: prevMonthStart,
              lt: lastMonth
            },
            ...(demoOrg ? { orgId: { not: demoOrg.id } } : {}) // Redundant but safe
          },
          select: { amountP: true }
        })

        const prevRevenue = prevOrgInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
        const growth = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0

        return {
          orgName: org.name,
          students: org._count.students,
          monthlyRevenue,
          growth
        }
      })
    )

    return NextResponse.json({
      current: {
        mrr,
        mrrGrowth,
        arr,
        totalRevenue,
        thisMonthCollected,
        pendingRevenue,
        failedPayments: failedPaymentsList.length
      },
      breakdown: {
        subscriptionRevenue,
        oneTimePayments,
        refunds,
        chargebacks,
        netRevenue
      },
      paymentStatus: {
        successful,
        pending,
        failed,
        refunded,
        successRate
      },
      failedPayments: failedPaymentsFormatted,
      topRevenueGenerators
    })
  } catch (error: any) {
    logger.error('Error fetching revenue data', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch revenue data',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

