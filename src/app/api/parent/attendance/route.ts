import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Check if user is a parent in this organization
    const parent = await prisma.parent.findFirst({
      where: {
        userId: session.user.id,
        organizationId: org.id
      }
    })

    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }

    // Get all children of this parent
    const children = await prisma.student.findMany({
      where: {
        parentId: parent.id,
        organizationId: org.id
      },
      include: {
        classes: {
          include: {
            teacher: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (children.length === 0) {
      return NextResponse.json({ attendanceData: [] })
    }

    // Get attendance data for each child
    const attendanceData = await Promise.all(
      children.map(async (child) => {
        // Get attendance records for the last 12 months
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            studentId: child.id,
            date: {
              gte: twelveMonthsAgo
            }
          },
          orderBy: {
            date: 'desc'
          }
        })

        // Calculate overall attendance percentage
        const totalRecords = attendanceRecords.length
        const presentRecords = attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length
        const overallAttendance = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0

        // Get current week attendance
        const currentWeekStart = new Date()
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
        currentWeekStart.setHours(0, 0, 0, 0)

        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6) // Sunday
        currentWeekEnd.setHours(23, 59, 59, 999)

        const weeklyAttendance = await prisma.attendance.findMany({
          where: {
            studentId: child.id,
            date: {
              gte: currentWeekStart,
              lte: currentWeekEnd
            }
          },
          orderBy: {
            date: 'asc'
          }
        })

        // Format weekly attendance data
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const weeklyData = daysOfWeek.map((day, index) => {
          const dayDate = new Date(currentWeekStart)
          dayDate.setDate(dayDate.getDate() + index)
          
          const dayAttendance = weeklyAttendance.find(a => 
            a.date.toDateString() === dayDate.toDateString()
          )

          return {
            day,
            date: dayDate.toISOString().split('T')[0],
            status: dayAttendance?.status || 'NOT_SCHEDULED',
            time: dayAttendance?.time || undefined
          }
        })

        // Get monthly attendance data (last 4 weeks)
        const monthlyData = []
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(currentWeekStart)
          weekStart.setDate(weekStart.getDate() - (i * 7))
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)

          const weekAttendance = await prisma.attendance.findMany({
            where: {
              studentId: child.id,
              date: {
                gte: weekStart,
                lte: weekEnd
              }
            }
          })

          const present = weekAttendance.filter(a => a.status === 'PRESENT').length
          const absent = weekAttendance.filter(a => a.status === 'ABSENT').length
          const late = weekAttendance.filter(a => a.status === 'LATE').length

          monthlyData.push({
            week: `Week ${4 - i}`,
            present,
            absent,
            late
          })
        }

        // Get yearly attendance data (last 12 months)
        const yearlyData = []
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date()
          monthStart.setMonth(monthStart.getMonth() - i, 1)
          monthStart.setHours(0, 0, 0, 0)

          const monthEnd = new Date(monthStart)
          monthEnd.setMonth(monthEnd.getMonth() + 1, 0)
          monthEnd.setHours(23, 59, 59, 999)

          const monthAttendance = await prisma.attendance.findMany({
            where: {
              studentId: child.id,
              date: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          })

          const present = monthAttendance.filter(a => a.status === 'PRESENT').length
          const absent = monthAttendance.filter(a => a.status === 'ABSENT').length
          const late = monthAttendance.filter(a => a.status === 'LATE').length

          yearlyData.push({
            month: months[monthStart.getMonth()],
            present,
            absent,
            late
          })
        }

        // Get the primary class for this child
        const primaryClass = child.classes[0] // Assuming first class is primary

        return {
          id: child.id,
          name: child.name,
          class: primaryClass?.name || 'No Class Assigned',
          teacher: primaryClass?.teacher?.user?.name || 'No Teacher Assigned',
          overallAttendance,
          weeklyAttendance: weeklyData,
          monthlyAttendance: monthlyData,
          yearlyAttendance: yearlyData
        }
      })
    )

    return NextResponse.json({ attendanceData })

  } catch (error) {
    console.error('Error fetching parent attendance data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
