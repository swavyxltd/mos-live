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
    
    // Check if organization is deactivated
    if (org.status && org.status === 'DEACTIVATED') {
      return NextResponse.json(
        { error: 'This organization has been deactivated' },
        { status: 403 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Get total students
    const totalStudents = await prisma.student.count({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })

    // Get students enrolled this month
    const newStudentsThisMonth = await prisma.student.count({
      where: {
        orgId: org.id,
        isArchived: false,
        createdAt: { gte: thisMonth }
      }
    })

    // Get students enrolled last month (for growth calculation)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const lastMonthStudents = await prisma.student.count({
      where: {
        orgId: org.id,
        isArchived: false,
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })

    const studentGrowth = lastMonthStudents > 0
      ? ((newStudentsThisMonth - lastMonthStudents) / lastMonthStudents) * 100
      : newStudentsThisMonth > 0 ? 100 : 0

    // Get active classes
    const activeClasses = await prisma.class.count({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })

    // Get staff members
    const staffMembers = await prisma.userOrgMembership.count({
      where: {
        orgId: org.id,
        role: { in: ['ADMIN', 'STAFF'] }
      }
    })

    // Get attendance data for this week
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    const weekAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        date: { gte: weekStart }
      },
      select: { status: true }
    })

    const presentCount = weekAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const totalAttendanceRecords = weekAttendance.length
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0

    // Get last week's attendance for comparison
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setDate(weekStart.getDate() - 1)

    const lastWeekAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        date: { gte: lastWeekStart, lte: lastWeekEnd }
      },
      select: { status: true }
    })

    const lastWeekPresent = lastWeekAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const lastWeekTotal = lastWeekAttendance.length
    const lastWeekRate = lastWeekTotal > 0
      ? Math.round((lastWeekPresent / lastWeekTotal) * 100)
      : 0

    const attendanceGrowth = attendanceRate - lastWeekRate

    // Get monthly revenue from invoices
    const monthlyInvoices = await prisma.invoice.findMany({
      where: {
        orgId: org.id,
        status: 'PAID',
        paidAt: {
          gte: thisMonth,
          not: null
        }
      },
      select: { amountP: true }
    })

    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)

    // Get last month's revenue for comparison
    const lastMonthInvoices = await prisma.invoice.findMany({
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
    })

    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + Number(inv.amountP || 0) / 100, 0)
    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0

    // Get pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        orgId: org.id,
        status: 'PENDING',
        dueDate: { gte: now }
      }
    })

    // Get overdue payments
    const overduePayments = await prisma.invoice.count({
      where: {
        orgId: org.id,
        status: { in: ['OVERDUE', 'PENDING'] },
        dueDate: { lt: now }
      }
    })

    // Get pending applications
    const pendingApplications = await prisma.application.count({
      where: {
        orgId: org.id,
        status: 'PENDING'
      }
    })

    // Get attendance trend for last 14 days
    const attendanceTrend = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)

      const dayAttendance = await prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: date, lt: nextDate }
        },
        select: { status: true }
      })

      const dayPresent = dayAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
      const dayTotal = dayAttendance.length
      const dayRate = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0

      attendanceTrend.push({
        date: date.toISOString().split('T')[0],
        value: dayRate
      })
    }

    return NextResponse.json({
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
      attendanceTrend
    })
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    )
  }
}

