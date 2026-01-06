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
  
  // Get attendance records from database - include current year and previous year to support yearly view
  // Always exclude future dates
  const now = new Date()
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  
  // Fetch all records from the start of previous year to support viewing historical data
  // This allows users to view data from the previous year (e.g., 2025 data in 2026)
  const currentYear = now.getFullYear()
  const previousYear = currentYear - 1
  const yearStart = new Date(previousYear, 0, 1) // January 1 of previous year
  yearStart.setHours(0, 0, 0, 0)
  
  // Use today as end date (exclude future dates)
  const endDate = today
  
  // Get all active classes with their details
  const allActiveClasses = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    include: {
      User: {
        select: {
          name: true
        }
      },
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
  const classDetailsMap = new Map<string, {
    id: string
    name: string
    teacher: string
    totalStudents: number
  }>()
  
  allActiveClasses.forEach(cls => {
    classStudentCounts.set(cls.id, cls._count.StudentClass)
    classDetailsMap.set(cls.id, {
      id: cls.id,
      name: cls.name,
      teacher: cls.User?.name || 'No Teacher',
      totalStudents: cls._count.StudentClass
    })
  })
  
  // Debug: Check total count
  const totalCount = await prisma.attendance.count({
    where: {
      orgId: org.id,
      date: {
        gte: yearStart,
        lte: endDate
      }
    }
  })
  console.log(`[Server] Total attendance records for org ${org.id}: ${totalCount}`)

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      orgId: org.id,
      date: {
        gte: yearStart,
        lte: endDate // Exclude future dates
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
          isArchived: true,
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

  // Debug: Log how many records were fetched
  console.log(`[Server] Fetched ${attendanceRecords.length} attendance records from database`)
  const boysTestClassId = '6f8a777a-d6da-457e-924a-75510db99c17'
  const boysTestClassRecords = attendanceRecords.filter(r => r.classId === boysTestClassId)
  console.log(`[Server] Boys Test Class (${boysTestClassId}) records: ${boysTestClassRecords.length}`)
  if (boysTestClassRecords.length > 0) {
    const boysDates = [...new Set(boysTestClassRecords.map(r => r.date.toISOString().split('T')[0]))].sort()
    console.log(`[Server] Boys Test Class unique dates: ${boysDates.length}, First: ${boysDates[0]}, Last: ${boysDates[boysDates.length - 1]}`)
  }
  const boysRecords = attendanceRecords.filter(r => r.Class?.name?.includes('Boys'))
  console.log(`[Server] All Boys class records (by name): ${boysRecords.length}`)

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
    // Skip archived classes
    if (record.Class?.isArchived) return acc
    
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
      
      // Get weekly attendance for this student - always use current week
      const studentAttendanceMap = attendanceByStudentAndDate.get(record.Student.id)
      
      // Calculate current week start (Monday)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const currentDay = today.getDay()
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - daysFromMonday)
      weekStart.setHours(0, 0, 0, 0)
      
      // Generate weekdays (Monday to Friday) for current week
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const weeklyAttendance: Array<{
        day: string
        date: string
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
        time?: string
      }> = []
      
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

  // Debug: Log how many entries we're sending
  console.log(`[Server] Sending ${attendanceData.length} attendance entries to client`)
  const boysEntries = attendanceData.filter((item: any) => item.name?.includes('Boys'))
  console.log(`[Server] Boys class entries: ${boysEntries.length}`)
  if (boysEntries.length > 0) {
    const dates = boysEntries.map((item: any) => item.date).sort()
    console.log(`[Server] Boys class date range: ${dates[0]?.toISOString()} to ${dates[dates.length - 1]?.toISOString()}`)
  }

  // Serialize dates for client component
  const serializedData = attendanceData.map(item => ({
    ...item,
    date: item.date.toISOString()
  }))

  // Pass all active classes to client so they can be displayed even without attendance
  const allActiveClassesData = Array.from(classDetailsMap.values())

  return <AttendancePageClient attendanceData={serializedData || []} allActiveClasses={allActiveClassesData} />
}
