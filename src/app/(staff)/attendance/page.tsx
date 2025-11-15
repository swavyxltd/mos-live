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
  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28) // 4 weeks ago
  fourWeeksAgo.setHours(0, 0, 0, 0)
  
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      orgId: org.id,
      date: {
        gte: fourWeeksAgo
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
      acc[key] = {
        id: key,
        classId: classId,
        name: record.Class?.name || 'No Class',
        teacher: record.Class?.User?.name || 'No Teacher',
        date: record.date,
        totalStudents: 0,
        present: 0,
        absent: 0,
        late: 0,
        students: []
      }
    }
    
    acc[key].totalStudents++
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
  const attendanceData = Object.values(attendanceByClass)
    .map((item: any) => ({
      ...item,
      students: item.students.sort((a: any, b: any) => {
        const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
        if (lastNameCompare !== 0) return lastNameCompare
        return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
      })
    }))
    .slice(0, 10) // Show most recent 10

  // Serialize dates for client component
  const serializedData = attendanceData.map(item => ({
    ...item,
    date: item.date.toISOString()
  }))

  return <AttendancePageClient attendanceData={serializedData || []} />
}
