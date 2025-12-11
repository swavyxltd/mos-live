import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { AttendancePageClient } from '@/components/attendance-page-client'

export default async function AttendancePage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  // Get attendance records from database - include last 90 days to support week/month/year filtering
  // Always exclude future dates
  const now = new Date()
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(now.getDate() - 90) // 90 days ago to support month/year views
  ninetyDaysAgo.setHours(0, 0, 0, 0)
  
  // Get actual student counts per class from database
  const classesWithStudentCounts = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    select: {
      id: true,
      _count: {
        select: {
          StudentClass: {
            where: {
              Student: {
                isArchived: false
              }
            }
          }
        }
      }
    }
  })
  
  const classStudentCounts = new Map<string, number>()
  classesWithStudentCounts.forEach(cls => {
    classStudentCounts.set(cls.id, cls._count.StudentClass)
  })
  
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      orgId: org.id,
      date: {
        gte: ninetyDaysAgo,
        lte: today // Exclude future dates
      }
    },
    include: {
      Student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isArchived: true
        }
      },
      Class: {
        select: {
          id: true,
          name: true,
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

  // Build attendance map by student and date for weekly breakdown
  const attendanceByStudentAndDate = new Map<string, Map<string, any>>()
  attendanceRecords.forEach((record) => {
    if (record.Student.isArchived) return
    const studentId = record.Student.id
    const dateKey = record.date.toISOString().split('T')[0]
    
    if (!attendanceByStudentAndDate.has(studentId)) {
      attendanceByStudentAndDate.set(studentId, new Map())
    }
    attendanceByStudentAndDate.get(studentId)!.set(dateKey, {
      status: record.status,
      time: record.time || undefined
    })
  })

  // Group attendance by class and date
  const attendanceByClass = attendanceRecords.reduce((acc, record) => {
    if (record.Student.isArchived) return acc
    
    const classId = record.classId || 'no-class'
    const dateKey = record.date.toISOString().split('T')[0]
    const key = `${classId}-${dateKey}`
    
    if (!acc[key]) {
      // Use actual student count from database, not attendance record count
      const actualStudentCount = classStudentCounts.get(classId) || 0
      acc[key] = {
        id: key,
        classId: classId,
        name: record.Class?.name || 'No Class',
        teacher: record.Class?.User?.name || 'No Teacher',
        date: record.date,
        totalStudents: actualStudentCount, // Use actual enrolled student count
        present: 0,
        absent: 0,
        late: 0,
        students: [],
        studentIds: new Set<string>() // Track which students we've already added
      }
    }
    if (record.status === 'PRESENT') {
      acc[key].present++
    } else if (record.status === 'ABSENT') {
      acc[key].absent++
    } else if (record.status === 'LATE') {
      acc[key].late++
    }
    
    // Only add student once per class-date combination
    if (!acc[key].studentIds.has(record.Student.id)) {
      acc[key].studentIds.add(record.Student.id)
      
      // Get weekly attendance for this student
      const studentAttendanceMap = attendanceByStudentAndDate.get(record.Student.id)
      const weeklyAttendance: Array<{
        day: string
        date: string
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
        time?: string
      }> = []
      
      // Calculate week start (Monday) for the record's date
      const recordDate = new Date(record.date)
      const dayOfWeek = recordDate.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = new Date(recordDate)
      weekStart.setDate(recordDate.getDate() - daysFromMonday)
      weekStart.setHours(0, 0, 0, 0)
      
      // Generate weekdays (Monday to Friday)
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(weekStart.getDate() + i)
        const dayDateKey = dayDate.toISOString().split('T')[0]
        const isFuture = dayDate > today
        
        const dayAttendance = studentAttendanceMap?.get(dayDateKey)
        
        if (dayAttendance && !isFuture) {
          weeklyAttendance.push({
            day: dayNames[i],
            date: dayDateKey,
            status: dayAttendance.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED',
            time: dayAttendance.time
          })
        } else {
          weeklyAttendance.push({
            day: dayNames[i],
            date: dayDateKey,
            status: 'NOT_SCHEDULED',
            time: undefined
          })
        }
      }
      
      acc[key].students.push({
        id: record.Student.id,
        name: `${record.Student.firstName} ${record.Student.lastName}`,
        firstName: record.Student.firstName,
        lastName: record.Student.lastName,
        status: record.status,
        time: record.time || undefined,
        weeklyAttendance: weeklyAttendance
      })
    }
    
    return acc
  }, {} as Record<string, any>)

  // Sort students alphabetically within each attendance record and remove Set
  const allAttendanceData = Object.values(attendanceByClass)
    .map((item: any) => {
      const { studentIds, ...rest } = item // Remove Set before serialization
      return {
        ...rest,
        students: item.students.sort((a: any, b: any) => {
          const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
          if (firstNameCompare !== 0) return firstNameCompare
          return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
        })
      }
    })
    .sort((a: any, b: any) => {
      // Sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  // Return all attendance data (filtering will be done client-side based on selected week/month/year)
  // No need to limit to 10 most recent since we have filtering
  const attendanceData = allAttendanceData

  // Serialize dates for client component
  const serializedData = attendanceData.map(item => ({
    ...item,
    date: item.date.toISOString()
  }))

  return <AttendancePageClient attendanceData={serializedData || []} />
}
