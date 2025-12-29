import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ParentAttendancePageClient } from '@/components/parent-attendance-page-client'

export default async function ParentAttendancePage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  let attendanceData: any[] = []

  try {
    // Get parent's students
    const students = await prisma.student.findMany({
      where: {
        orgId: org.id,
        primaryParentId: session.user.id,
        isArchived: false
      },
      include: {
        StudentClass: {
          include: {
            Class: {
              include: {
                User: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Get all attendance records for these students (last 90 days for year view)
    // Only include dates up to today (exclude future dates)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    ninetyDaysAgo.setHours(0, 0, 0, 0)
    
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    const allAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        Student: {
          primaryParentId: session.user.id,
          isArchived: false
        },
        date: {
          gte: ninetyDaysAgo,
          lte: todayEnd
        }
      },
      include: {
        Student: true,
        Class: {
          include: {
            User: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Get current week (Monday to Friday) - same logic as dashboard
    const today = new Date()
    const currentDay = today.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert Sunday (0) to 6, others to 0-4
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - daysFromMonday)
    weekStart.setHours(0, 0, 0, 0)

    // Generate all weekdays (Monday to Friday)
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const weekDays: Array<{ day: string; date: Date }> = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      weekDays.push({
        day: dayNames[i],
        date: date
      })
    }

    // Build attendance map by student and date
    const attendanceByStudentAndDate = new Map<string, Map<string, any>>()
    allAttendance.forEach((attendance: any) => {
      const studentId = attendance.studentId
      const dateKey = new Date(attendance.date).toISOString().split('T')[0]
      
      if (!attendanceByStudentAndDate.has(studentId)) {
        attendanceByStudentAndDate.set(studentId, new Map())
      }
      attendanceByStudentAndDate.get(studentId)!.set(dateKey, attendance)
    })

    // Transform data for each student
    for (const student of students) {
      const studentAttendance = allAttendance.filter(a => a.studentId === student.id)

      // Get the primary class (first class)
      const primaryClass = student.StudentClass[0]?.Class
      const className = primaryClass?.name || 'Unknown'
      const teacherName = primaryClass?.User?.name || 'Unknown'

      // Build weekly attendance data with all weekdays (same as dashboard)
      const weeklyData: Array<{
        day: string
        date: string
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
        time?: string
      }> = []

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayDateString = today.toISOString().split('T')[0]

      weekDays.forEach(({ day, date }) => {
        const dateKey = date.toISOString().split('T')[0]
        const isFuture = dateKey > todayDateString
        const attendance = attendanceByStudentAndDate.get(student.id)?.get(dateKey)
        
        // Only show attendance records for dates that have occurred (today or earlier)
        // Future dates should always be NOT_SCHEDULED, and we should not show attendance data for future dates
        if (attendance && !isFuture) {
          weeklyData.push({
            day: day,
            date: dateKey,
            status: attendance.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED',
            time: attendance.status === 'PRESENT' || attendance.status === 'LATE' ? attendance.time || '4:00 PM' : undefined
          })
        } else {
          // No attendance record for this day or it's a future date - show as NOT_SCHEDULED
          weeklyData.push({
            day: day,
            date: dateKey,
            status: 'NOT_SCHEDULED',
            time: undefined
          })
        }
      })

      // Calculate monthly attendance - all days with attendance in the month
      const monthlyAttendance = calculateMonthlyAttendanceDaily(studentAttendance)

      // Calculate yearly attendance - monthly averages (one dot per month)
      const yearlyAttendance = calculateYearlyAttendanceMonthlyAverage(studentAttendance)

      // Calculate overall attendance for current week (only count days that have occurred so far)
      // Same logic as dashboard - reuse todayDateString from above
      
      // Filter to only days that have occurred (today or earlier) AND have actual attendance records
      // Exclude NOT_SCHEDULED days from the calculation
      const daysSoFar = weeklyData.filter(day => {
        const hasOccurred = day.date <= todayDateString
        const hasAttendanceRecord = day.status !== 'NOT_SCHEDULED'
        return hasOccurred && hasAttendanceRecord
      })
      
      // Count present/late days that have occurred
      const presentDays = daysSoFar.filter(day => 
        day.status === 'PRESENT' || day.status === 'LATE'
      ).length
      
      // Count total days that have occurred with attendance records
      const totalDaysSoFar = daysSoFar.length
      
      const overallAttendance = totalDaysSoFar > 0 
        ? Math.round((presentDays / totalDaysSoFar) * 100)
        : 0

      // Store all attendance records for this student (for client-side week filtering)
      const allAttendanceRecords = studentAttendance.map(att => ({
        date: new Date(att.date).toISOString().split('T')[0],
        status: att.status,
        time: att.time || undefined
      }))

      attendanceData.push({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        class: className,
        teacher: teacherName,
        overallAttendance,
        weeklyAttendance: weeklyData, // Current week (default)
        allAttendanceRecords, // All records for client-side filtering
        monthlyAttendance,
        yearlyAttendance
      })
    }
  } catch (error: any) {
    console.error('Error fetching attendance data:', error)
  }

  return (
    <ParentAttendancePageClient attendanceData={attendanceData} />
  )
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekKey(date: Date): string {
  const monday = getWeekStart(date)
  return `${monday.getFullYear()}-W${getWeekNumber(monday)}`
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function calculateMonthlyAttendanceDaily(attendance: any[]): any[] {
  // Return all days with attendance records, sorted by date
  return attendance
    .map(att => ({
      date: new Date(att.date).toISOString().split('T')[0],
      status: att.status,
      time: att.time || undefined
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calculateYearlyAttendanceMonthlyAverage(attendance: any[]): any[] {
  const monthMap = new Map<string, { present: number; absent: number; late: number }>()
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  attendance.forEach(att => {
    const date = new Date(att.date)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { present: 0, absent: 0, late: 0 })
    }
    
    const month = monthMap.get(monthKey)!
    if (att.status === 'PRESENT') month.present++
    else if (att.status === 'ABSENT') month.absent++
    else if (att.status === 'LATE') month.late++
  })

  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => {
      const [year, month] = key.split('-')
      const totalDays = data.present + data.absent + data.late
      const averagePercentage = totalDays > 0 
        ? Math.round(((data.present + data.late) / totalDays) * 100)
        : 0
      return {
        month: monthNames[parseInt(month)],
        monthIndex: parseInt(month),
        year: parseInt(year),
        averagePercentage,
        ...data
      }
    })
}
