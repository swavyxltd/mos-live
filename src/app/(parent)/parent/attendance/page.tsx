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
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    const allAttendance = await prisma.attendance.findMany({
      where: {
        orgId: org.id,
        Student: {
          primaryParentId: session.user.id,
          isArchived: false
        },
        date: {
          gte: ninetyDaysAgo
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

    // Transform data for each student
    for (const student of students) {
      const studentAttendance = allAttendance.filter(a => a.studentId === student.id)
      
      if (studentAttendance.length === 0) continue

      // Get the primary class (first class)
      const primaryClass = student.StudentClass[0]?.Class
      const className = primaryClass?.name || 'Unknown'
      const teacherName = primaryClass?.User?.name || 'Unknown'

      // Parse class schedule to get scheduled days
      let scheduledDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] // Default
      let startTime = '5:00 PM' // Default
      
      try {
        if (primaryClass?.schedule) {
          const schedule = typeof primaryClass.schedule === 'string' 
            ? JSON.parse(primaryClass.schedule) 
            : primaryClass.schedule
          
          if (schedule?.days && Array.isArray(schedule.days) && schedule.days.length > 0) {
            scheduledDays = schedule.days
          }
          if (schedule?.startTime) {
            startTime = schedule.startTime
          }
        }
      } catch (e) {
        // If schedule parsing fails, use default Monday-Friday
        console.error('Error parsing schedule:', e)
      }

      // Map full day names to abbreviations
      const dayNameMap: Record<string, string> = {
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Saturday': 'Sat',
        'Sunday': 'Sun'
      }

      // Map day names to day of week numbers (0 = Sunday, 1 = Monday, etc.)
      const dayToNumber: Record<string, number> = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
      }

      // Get current week's attendance for scheduled days only
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const currentWeekStart = getWeekStart(today)
      const weeklyAttendance: any[] = []
      
      // Create attendance entries for each scheduled day in the current week
      for (const scheduledDay of scheduledDays) {
        const dayNumber = dayToNumber[scheduledDay]
        if (dayNumber === undefined) continue

        // Calculate the date for this scheduled day in the current week
        // Monday = 1, so if scheduledDay is Monday, we add 0 days
        // Tuesday = 2, so we add 1 day, etc.
        const date = new Date(currentWeekStart)
        const daysToAdd = dayNumber - 1 // Monday (1) - 1 = 0, Tuesday (2) - 1 = 1, etc.
        date.setDate(date.getDate() + daysToAdd)
        date.setHours(0, 0, 0, 0)
        
        // Check if this day is in the past or future
        const checkToday = new Date()
        checkToday.setHours(0, 0, 0, 0)
        const isPast = date < checkToday
        const isToday = date.getTime() === checkToday.getTime()
        const isFuture = date > checkToday
        
        // Find attendance record for this day
        const attendanceRecord = studentAttendance.find(att => {
          const attDate = new Date(att.date)
          attDate.setHours(0, 0, 0, 0)
          return attDate.getTime() === date.getTime()
        })
        
        if (attendanceRecord) {
          // Has attendance record - show it
          weeklyAttendance.push({
            day: dayNameMap[scheduledDay] || scheduledDay.slice(0, 3),
            date: date.toISOString().split('T')[0],
            status: attendanceRecord.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED',
            time: (attendanceRecord.status === 'PRESENT' || attendanceRecord.status === 'LATE') ? startTime : undefined
          })
        } else if (isPast) {
          // Past day with no attendance - mark as NOT_SCHEDULED (attendance should have been taken)
          weeklyAttendance.push({
            day: dayNameMap[scheduledDay] || scheduledDay.slice(0, 3),
            date: date.toISOString().split('T')[0],
            status: 'NOT_SCHEDULED' as const,
            time: undefined
          })
        } else {
          // Future or today - show as scheduled but don't mark as NOT_SCHEDULED
          // Include it but the component will handle displaying it appropriately
          // We'll use NOT_SCHEDULED status but the component should show it differently for future days
          weeklyAttendance.push({
            day: dayNameMap[scheduledDay] || scheduledDay.slice(0, 3),
            date: date.toISOString().split('T')[0],
            status: 'NOT_SCHEDULED' as const,
            time: undefined
          })
        }
      }
      
      // Sort by the order of scheduled days (already in correct order, but ensure it)
      weeklyAttendance.sort((a, b) => {
        const aIndex = scheduledDays.findIndex(day => {
          const dayAbbr = dayNameMap[day] || day.slice(0, 3)
          return dayAbbr === a.day
        })
        const bIndex = scheduledDays.findIndex(day => {
          const dayAbbr = dayNameMap[day] || day.slice(0, 3)
          return dayAbbr === b.day
        })
        return aIndex - bIndex
      })

      // Calculate monthly attendance (group by week)
      const monthlyAttendance = calculateMonthlyAttendance(studentAttendance)

      // Calculate yearly attendance (group by month)
      const yearlyAttendance = calculateYearlyAttendance(studentAttendance)

      // Calculate overall attendance
      const totalDays = studentAttendance.length
      const presentDays = studentAttendance.filter(a => 
        a.status === 'PRESENT' || a.status === 'LATE'
      ).length
      const overallAttendance = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

      attendanceData.push({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        class: className,
        teacher: teacherName,
        overallAttendance,
        weeklyAttendance,
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

function calculateMonthlyAttendance(attendance: any[]): any[] {
  const weekMap = new Map<string, { present: number; absent: number; late: number }>()
  
  attendance.forEach(att => {
    const date = new Date(att.date)
    const weekKey = getWeekKey(date)
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { present: 0, absent: 0, late: 0 })
    }
    
    const week = weekMap.get(weekKey)!
    if (att.status === 'PRESENT') week.present++
    else if (att.status === 'ABSENT') week.absent++
    else if (att.status === 'LATE') week.late++
  })

  const weeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-4) // Last 4 weeks
  
  return weeks.map(([key, data], index) => ({
    week: `Week ${index + 1}`,
    ...data
  }))
}

function calculateYearlyAttendance(attendance: any[]): any[] {
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
      return {
        month: monthNames[parseInt(month)],
        ...data
      }
    })
}
