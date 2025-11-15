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
    // If no attendance this week, look at last 7 days instead
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    // Also check last 7 days as fallback
    const last7Days = new Date(now)
    last7Days.setDate(now.getDate() - 7)
    last7Days.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setDate(weekStart.getDate() - 1)

    const [weekAttendance, lastWeekAttendance, recentAttendance] = await Promise.all([
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
      }),
      // Fallback: get last 7 days if no data this week
      prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: last7Days }
        },
        select: { status: true }
      })
    ])

    // Use recent attendance (last 7 days) if no data this week
    const attendanceData = weekAttendance.length > 0 ? weekAttendance : recentAttendance
    
    const presentCount = attendanceData.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const totalAttendanceRecords = attendanceData.length
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0

    const lastWeekPresent = lastWeekAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const lastWeekTotal = lastWeekAttendance.length
    const lastWeekRate = lastWeekTotal > 0
      ? Math.round((lastWeekPresent / lastWeekTotal) * 100)
      : 0

    // If no last week data, compare to previous 7 days
    const attendanceGrowth = lastWeekTotal > 0 
      ? attendanceRate - lastWeekRate
      : 0

    // Calculate monthly revenue based on students × class fees
    // Get all classes with their fees and student counts
    const classes = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false
      },
      include: {
        _count: {
          select: {
            StudentClass: true
          }
        }
      }
    })

    // Calculate current month revenue: sum of (monthlyFee × studentCount) for all classes
    const monthlyRevenue = classes.reduce((sum, cls) => {
      const monthlyFee = cls.monthlyFeeP ? Number(cls.monthlyFeeP) / 100 : 0
      const studentCount = cls._count.StudentClass
      return sum + (monthlyFee * studentCount)
    }, 0)

    // Get payment records for pending/overdue counts
    const currentMonthStr = now.toISOString().substring(0, 7) // Format: YYYY-MM
    
    const [
      pendingPayments,
      overduePayments,
      pendingApplications
    ] = await Promise.all([
      prisma.monthlyPaymentRecord.count({
        where: {
          orgId: org.id,
          status: 'PENDING',
          month: currentMonthStr
        }
      }),
      prisma.monthlyPaymentRecord.count({
        where: {
          orgId: org.id,
          status: { in: ['OVERDUE', 'LATE'] },
          month: currentMonthStr
        }
      }),
      prisma.application.count({
        where: {
          orgId: org.id,
          status: { in: ['NEW', 'PENDING', 'REVIEWED'] }
        }
      })
    ])

    // Calculate last month revenue based on students enrolled by end of last month
    // Reuse lastMonthEnd defined earlier
    const lastMonthClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        createdAt: { lte: lastMonthEnd }
      },
      include: {
        StudentClass: {
          include: {
            Student: {
              select: {
                createdAt: true
              }
            }
          }
        }
      }
    })

    const lastMonthRevenue = lastMonthClasses.reduce((sum, cls) => {
      const monthlyFee = cls.monthlyFeeP ? Number(cls.monthlyFeeP) / 100 : 0
      // Count only students that were created by end of last month
      const studentCount = cls.StudentClass.filter(sc => sc.Student.createdAt <= lastMonthEnd).length
      return sum + (monthlyFee * studentCount)
    }, 0)

    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0

    // Calculate paid this month count from payment records
    const paidThisMonth = await prisma.monthlyPaymentRecord.count({
      where: {
        orgId: org.id,
        status: 'PAID',
        month: currentMonthStr,
        paidAt: { not: null }
      }
    })

    // Calculate average payment time (from payment record creation to payment)
    const paidPaymentsWithDates = await prisma.monthlyPaymentRecord.findMany({
      where: {
        orgId: org.id,
        status: 'PAID',
        paidAt: { not: null }
      },
      select: {
        createdAt: true,
        paidAt: true
      },
      take: 100 // Sample last 100 paid payments
    })

    let averagePaymentTime = 0
    if (paidPaymentsWithDates.length > 0) {
      const paymentTimes = paidPaymentsWithDates
        .filter(payment => payment.createdAt && payment.paidAt)
        .map(payment => {
          const created = new Date(payment.createdAt!)
          const paid = new Date(payment.paidAt!)
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
      pendingPayments,
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

