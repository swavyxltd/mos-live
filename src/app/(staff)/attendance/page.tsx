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
  
  // Get attendance records from database - include current week and past 4 weeks
  // Always exclude future dates
  const now = new Date()
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28) // 4 weeks ago
  fourWeeksAgo.setHours(0, 0, 0, 0)
  
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
        gte: fourWeeksAgo,
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
        students: []
      }
    }
    if (record.status === 'PRESENT') {
      acc[key].present++
    } else if (record.status === 'ABSENT') {
      acc[key].absent++
    } else if (record.status === 'LATE') {
      acc[key].late++
    }
    
    acc[key].students.push({
      id: record.Student.id,
      name: `${record.Student.firstName} ${record.Student.lastName}`,
      firstName: record.Student.firstName,
      lastName: record.Student.lastName,
      status: record.status,
      time: record.time || undefined
    })
    
    return acc
  }, {} as Record<string, any>)

  // Sort students alphabetically within each attendance record
  const allAttendanceData = Object.values(attendanceByClass)
    .map((item: any) => ({
      ...item,
      students: item.students.sort((a: any, b: any) => {
        const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
        if (firstNameCompare !== 0) return firstNameCompare
        return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
      })
    }))
    .sort((a: any, b: any) => {
      // Sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  // Get only the most recent attendance record per class
  const classMap = new Map<string, any>()
  allAttendanceData.forEach((item: any) => {
    const classId = item.classId
    if (!classMap.has(classId) || new Date(item.date) > new Date(classMap.get(classId).date)) {
      classMap.set(classId, item)
    }
  })

  // Convert back to array and limit to 10 most recent
  const attendanceData = Array.from(classMap.values())
    .sort((a: any, b: any) => {
      // Sort by date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, 10) // Show most recent 10 classes

  // Serialize dates for client component
  const serializedData = attendanceData.map(item => ({
    ...item,
    date: item.date.toISOString()
  }))

  return <AttendancePageClient attendanceData={serializedData || []} />
}
