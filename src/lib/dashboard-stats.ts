import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface DashboardStats {
  totalStudents: number
  newStudentsThisMonth: number
  studentGrowth: number
  activeClasses: number
  staffMembers: number
  attendanceRate: number
  attendanceGrowth: number
  monthlyRevenue: number
  revenueGrowth: number
  pendingInvoices: number
  overduePayments: number
  pendingApplications: number
  attendanceTrend: Array<{ date: string; value: number }>
  paidThisMonth?: number
  averagePaymentTime?: number
}

// Helper function to retry database operations on connection pool errors
async function retryOnPoolError<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      const isPoolError = error?.message?.includes('connection pool') || 
                         error?.code === 'P1001' ||
                         error?.code === 'P1017'
      
      if (isPoolError && i < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

export async function getDashboardStats(teacherId?: string): Promise<DashboardStats | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return null
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // If teacherId is provided, get their classes first to filter all queries
    let teacherClassIds: string[] | undefined = undefined
    if (teacherId) {
      const teacherClasses = await prisma.class.findMany({
        where: {
          orgId: org.id,
          teacherId: teacherId,
          isArchived: false
        },
        select: { id: true }
      })
      teacherClassIds = teacherClasses.map(c => c.id)
      
      // If teacher has no classes, return empty stats
      if (teacherClassIds.length === 0) {
        return {
          totalStudents: 0,
          newStudentsThisMonth: 0,
          studentGrowth: 0,
          activeClasses: 0,
          staffMembers: 0,
          attendanceRate: 0,
          attendanceGrowth: 0,
          monthlyRevenue: 0,
          revenueGrowth: 0,
          pendingInvoices: 0,
          overduePayments: 0,
          pendingApplications: 0,
          attendanceTrend: []
        }
      }
    }

    // Run queries in smaller batches to avoid connection pool exhaustion
    // Batch 1: Student counts (with retry on pool errors)
    // For teachers, only count students in their classes
    const [
      totalStudents,
      newStudentsThisMonth,
      lastMonthStudents
    ] = await Promise.all([
      retryOnPoolError(() => prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false,
          ...(teacherClassIds && {
            StudentClass: {
              some: {
                classId: { in: teacherClassIds }
              }
            }
          })
        }
      })),
      retryOnPoolError(() => prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false,
          createdAt: { gte: thisMonth },
          ...(teacherClassIds && {
            StudentClass: {
              some: {
                classId: { in: teacherClassIds }
              }
            }
          })
        }
      })),
      retryOnPoolError(() => prisma.student.count({
        where: {
          orgId: org.id,
          isArchived: false,
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd
          },
          ...(teacherClassIds && {
            StudentClass: {
              some: {
                classId: { in: teacherClassIds }
              }
            }
          })
        }
      }))
    ])

    // Batch 2: Classes and staff
    const [
      activeClasses,
      staffMembers
    ] = await Promise.all([
      retryOnPoolError(() => prisma.class.count({
        where: {
          orgId: org.id,
          isArchived: false,
          ...(teacherId && { teacherId })
        }
      })),
      retryOnPoolError(() => prisma.userOrgMembership.count({
        where: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] }
        }
      }))
    ])

    const studentGrowth = lastMonthStudents > 0
      ? ((newStudentsThisMonth - lastMonthStudents) / lastMonthStudents) * 100
      : newStudentsThisMonth > 0 ? 100 : 0

    // Get attendance data for this week and last week in parallel
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

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
          date: { gte: weekStart },
          ...(teacherClassIds && { classId: { in: teacherClassIds } })
        },
        select: { status: true }
      }),
      prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: lastWeekStart, lte: lastWeekEnd },
          ...(teacherClassIds && { classId: { in: teacherClassIds } })
        },
        select: { status: true }
      }),
      prisma.attendance.findMany({
        where: {
          orgId: org.id,
          date: { gte: last7Days },
          ...(teacherClassIds && { classId: { in: teacherClassIds } })
        },
        select: { status: true }
      })
    ])

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

    const attendanceGrowth = lastWeekTotal > 0 
      ? attendanceRate - lastWeekRate
      : 0

    // Calculate monthly revenue (filtered by teacher classes if applicable)
    const classes = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        ...(teacherId && { teacherId })
      },
      include: {
        _count: {
          select: {
            StudentClass: {
              ...(teacherClassIds && {
                where: {
                  classId: { in: teacherClassIds }
                }
              })
            }
          }
        }
      }
    })

    const monthlyRevenue = classes.reduce((sum, cls) => {
      const monthlyFee = cls.monthlyFeeP ? Number(cls.monthlyFeeP) / 100 : 0
      const studentCount = cls._count.StudentClass
      return sum + (monthlyFee * studentCount)
    }, 0)

    const currentMonthStr = now.toISOString().substring(0, 7)
    
    const [
      pendingPayments,
      overduePayments,
      pendingApplications
    ] = await Promise.all([
      prisma.monthlyPaymentRecord.count({
        where: {
          orgId: org.id,
          status: 'PENDING',
          month: currentMonthStr,
          ...(teacherClassIds && {
            Class: {
              id: { in: teacherClassIds }
            }
          })
        }
      }),
      prisma.monthlyPaymentRecord.count({
        where: {
          orgId: org.id,
          status: { in: ['OVERDUE', 'LATE'] },
          month: currentMonthStr,
          ...(teacherClassIds && {
            Class: {
              id: { in: teacherClassIds }
            }
          })
        }
      }),
      prisma.application.count({
        where: {
          orgId: org.id,
          status: { in: ['NEW', 'PENDING', 'REVIEWED'] }
        }
      })
    ])

    // Calculate last month revenue (filtered by teacher classes if applicable)
    const lastMonthClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        createdAt: { lte: lastMonthEnd },
        ...(teacherId && { teacherId })
      },
      include: {
        StudentClass: {
          where: {
            ...(teacherClassIds && { classId: { in: teacherClassIds } })
          },
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
      const studentCount = cls.StudentClass.filter(sc => sc.Student.createdAt <= lastMonthEnd).length
      return sum + (monthlyFee * studentCount)
    }, 0)

    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0

    const paidThisMonth = await prisma.monthlyPaymentRecord.count({
      where: {
        orgId: org.id,
        status: 'PAID',
        month: currentMonthStr,
        paidAt: { not: null },
        ...(teacherClassIds && {
          Class: {
            id: { in: teacherClassIds }
          }
        })
      }
    })

    const paidPaymentsWithDates = await prisma.monthlyPaymentRecord.findMany({
      where: {
        orgId: org.id,
        status: 'PAID',
        paidAt: { not: null },
        ...(teacherClassIds && {
          Class: {
            id: { in: teacherClassIds }
          }
        })
      },
      select: {
        createdAt: true,
        paidAt: true
      },
      take: 100
    })

    let averagePaymentTime = 0
    if (paidPaymentsWithDates.length > 0) {
      const paymentTimes = paidPaymentsWithDates
        .filter(payment => payment.createdAt && payment.paidAt)
        .map(payment => {
          const created = new Date(payment.createdAt!)
          const paid = new Date(payment.paidAt!)
          return (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        })
      
      if (paymentTimes.length > 0) {
        averagePaymentTime = paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length
      }
    }

    // Get attendance trend for last 14 days (filtered by teacher classes if applicable)
    const trendStartDate = new Date(now)
    trendStartDate.setDate(now.getDate() - 13)
    trendStartDate.setHours(0, 0, 0, 0)

    const allAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        date: { gte: trendStartDate },
        ...(teacherClassIds && { classId: { in: teacherClassIds } })
      },
      select: { 
        date: true,
        status: true
      }
    })

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

    return {
      totalStudents,
      newStudentsThisMonth,
      studentGrowth,
      activeClasses,
      staffMembers,
      attendanceRate,
      attendanceGrowth,
      monthlyRevenue,
      revenueGrowth,
      pendingInvoices: pendingPayments,
      overduePayments,
      pendingApplications,
      attendanceTrend,
      paidThisMonth,
      averagePaymentTime
    }
  } catch (error: any) {
    logger.error('Error fetching dashboard stats', error)
    return null
  }
}

