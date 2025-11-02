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

    // Get total students for MRR calculation
    const totalStudents = await prisma.student.count({
      where: { isArchived: false }
    })

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Calculate MRR (Monthly Recurring Revenue) - sum of all active students * £1
    const mrr = totalStudents * 1
    const arr = mrr * 12

    // Get revenue from paid invoices (only those with paidAt set and in this month)
    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          not: null,
          gte: thisMonth
        }
      },
      select: { amountP: true }
    })

    const allTimeInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID'
      },
      select: { amountP: true }
    })

    const thisMonthCollected = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
    const totalRevenue = allTimeInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now }
      },
      select: { amountP: true }
    })

    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get failed payments (invoices with failed status or overdue)
    const failedInvoices = await prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: { lt: now }
      },
      select: { amountP: true }
    })

    const failedPayments = failedInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Calculate breakdown
    const subscriptionRevenue = mrr
    const oneTimePayments = 0 // Could be calculated from one-time invoice types if we add that
    const refunds = 0 // Would need refund tracking
    const chargebacks = 0 // Would need chargeback tracking
    const netRevenue = thisMonthCollected - refunds - chargebacks

    // Get payment status counts
    const allInvoices = await prisma.invoice.findMany({
      select: { status: true }
    })

    const successful = allInvoices.filter(inv => inv.status === 'PAID').length
    const pending = allInvoices.filter(inv => inv.status === 'PENDING').length
    const failed = allInvoices.filter(inv => inv.status === 'OVERDUE').length
    const refunded = 0 // Would need refund status
    const totalPayments = allInvoices.length
    const successRate = totalPayments > 0 ? (successful / totalPayments) * 100 : 100

    // Get failed payments with org details for retry
    let failedPaymentsList: any[] = []
    try {
      failedPaymentsList = await prisma.invoice.findMany({
        where: {
          status: 'OVERDUE',
          dueDate: { lt: now }
        },
        include: {
          org: { select: { name: true } },
          student: { select: { firstName: true, lastName: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })
    } catch (error) {
      console.error('Error fetching failed payments:', error)
      // Continue with empty array
    }

    const failedPaymentsFormatted = failedPaymentsList.map((inv: any) => ({
      id: inv.id,
      orgName: inv.org?.name || 'Unknown Org',
      studentName: inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Unknown Student',
      amount: Number(inv.amountP || 0) / 100,
      failureDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      reason: 'Payment overdue',
      retryCount: 0,
      nextRetry: null,
      status: 'overdue',
      stripePaymentIntentId: null,
      organizationId: inv.orgId
    }))

    // Get top revenue generators (orgs by student count)
    const orgs = await prisma.org.findMany({
      where: { status: 'ACTIVE' },
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
            }
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
            }
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
    console.error('Error fetching revenue data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue data', details: error.message },
      { status: 500 }
    )
  }
}

