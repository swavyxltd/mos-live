import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Run parallel queries for better performance
    const [
      totalStudents,
      newStudentsThisMonth,
      lastMonthStudents,
      activeClasses,
      staffMembers
    ] = await Promise.all([
      prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false
        }
      }),
      prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false,
          createdAt: { gte: thisMonth }
        }
      }),
      prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false,
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd
          }
        }
      }),
      prisma.class.count({
        where: {
          orgId: org.id,
          isArchived: false
        }
      }),
      prisma.userOrgMembership.count({
        where: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] }
        }
      })
    ])

    const studentGrowth = lastMonthStudents > 0
      ? ((newStudentsThisMonth - lastMonthStudents) / lastMonthStudents) * 100
      : newStudentsThisMonth > 0 ? 100 : 0

    // Get attendance data for this week and last week in parallel
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setDate(weekStart.getDate() - 1)

    const [weekAttendance, lastWeekAttendance] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: weekStart }
        },
        select: { status: true }
      }),
      prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: lastWeekStart, lte: lastWeekEnd }
        },
        select: { status: true }
      })
    ])

    const presentCount = weekAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const totalAttendanceRecords = weekAttendance.length
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0

    const lastWeekPresent = lastWeekAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const lastWeekTotal = lastWeekAttendance.length
    const lastWeekRate = lastWeekTotal > 0
      ? Math.round((lastWeekPresent / lastWeekTotal) * 100)
      : 0

    const attendanceGrowth = attendanceRate - lastWeekRate

    // Get monthly revenue from invoices and other queries in parallel
    const [
      monthlyInvoices,
      lastMonthInvoices,
      pendingInvoices,
      overduePayments,
      pendingApplications
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          orgId: org.id,
          status: 'PAID',
          paidAt: {
            gte: thisMonth,
            not: null
          }
        },
        select: { amountP: true }
      }),
      prisma.invoice.findMany({
        where: {
          orgId: org.id,
          status: 'PAID',
          paidAt: {
            gte: lastMonth,
            lt: thisMonth,
            not: null
          }
        },
        select: { amountP: true }
      }),
      prisma.invoice.count({
        where: {
          orgId: org.id,
          status: 'PENDING',
          dueDate: { gte: now }
        }
      }),
      prisma.invoice.count({
        where: {
          orgId: org.id,
          status: { in: ['OVERDUE', 'PENDING'] },
          dueDate: { lt: now }
        }
      }),
      prisma.application.count({
        where: {
          orgId: org.id,
          status: 'PENDING'
        }
      })
    ])

    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0

    // Calculate paid this month count
    const paidThisMonth = monthlyInvoices.length

    // Calculate average payment time (from invoice creation to payment)
    const paidInvoicesWithDates = await prisma.invoice.findMany({
      where: {
        orgId: org.id,
        status: 'PAID',
        paidAt: { not: null },
        createdAt: { not: null }
      },
      select: {
        createdAt: true,
        paidAt: true
      },
      take: 100 // Sample last 100 paid invoices
    })

    let averagePaymentTime = 0
    if (paidInvoicesWithDates.length > 0) {
      const paymentTimes = paidInvoicesWithDates
        .filter(inv => inv.createdAt && inv.paidAt)
        .map(inv => {
          const created = new Date(inv.createdAt!)
          const paid = new Date(inv.paidAt!)
          return (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // Convert to days
        })
      
      if (paymentTimes.length > 0) {
        averagePaymentTime = paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length
      }
    }

    // Get attendance trend for last 14 days - optimized single query
    const trendStartDate = new Date(now)
    trendStartDate.setDate(now.getDate() - 13)
    trendStartDate.setHours(0, 0, 0, 0)

    const allAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        date: { gte: trendStartDate }
      },
      select: { 
        date: true,
        status: true
      }
    })

    // Group by date and calculate rates
    const attendanceByDate = new Map<string, { present: number; total: number }>()
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      attendanceByDate.set(dateKey, { present: 0, total: 0 })
    }

    allAttendance.forEach(att => {
      const dateKey = att.date.toISOString().split('T')[0]
      const entry = attendanceByDate.get(dateKey)
      if (entry) {
        entry.total++
        if (att.status === 'PRESENT' || att.status === 'LATE') {
          entry.present++
        }
      }
    })

    const attendanceTrend = Array.from(attendanceByDate.entries())
      .map(([date, { present, total }]) => ({
        date,
        value: total > 0 ? Math.round((present / total) * 100) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const response = NextResponse.json({
      totalStudents,
      newStudentsThisMonth,
      studentGrowth,
      activeClasses,
      staffMembers,
      attendanceRate,
      attendanceGrowth,
      monthlyRevenue,
      revenueGrowth,
      pendingInvoices,
      overduePayments,
      pendingApplications,
      attendanceTrend,
      paidThisMonth,
      averagePaymentTime
    })

    // Cache response for 30 seconds to improve performance
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    )
  }
}

