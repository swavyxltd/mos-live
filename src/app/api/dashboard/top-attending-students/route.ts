export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check if user is a teacher
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id
        }
      },
      select: {
        staffSubrole: true
      }
    })

    const isTeacher = membership?.staffSubrole === 'TEACHER' || (userRole === 'STAFF' && !membership?.staffSubrole)

    if (!isTeacher) {
      return NextResponse.json({ error: 'Only teachers can access this endpoint' }, { status: 403 })
    }

    // Get teacher's classes
    const teacherClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        teacherId: session.user.id
      },
      select: {
        id: true,
        name: true,
        StudentClass: {
          select: {
            studentId: true,
            Student: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    const teacherClassIds = teacherClasses.map(c => c.id)
    const studentIds = new Set<string>()
    
    // Collect all student IDs from teacher's classes
    teacherClasses.forEach(cls => {
      cls.StudentClass.forEach(sc => {
        if (sc.Student) {
          studentIds.add(sc.Student.id)
        }
      })
    })

    if (studentIds.size === 0) {
      return NextResponse.json({ students: [] })
    }

    // Get all attendance records for these students in teacher's classes
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    yearStart.setHours(0, 0, 0, 0)

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: { in: Array.from(studentIds) },
        classId: { in: teacherClassIds },
        orgId: org.id,
        date: {
          gte: yearStart,
          lte: now
        }
      },
      select: {
        studentId: true,
        status: true
      }
    })

    // Calculate attendance rate for each student
    const attendanceByStudent = new Map<string, { present: number; total: number }>()
    attendanceRecords.forEach(att => {
      const entry = attendanceByStudent.get(att.studentId) || { present: 0, total: 0 }
      entry.total++
      if (att.status === 'PRESENT' || att.status === 'LATE') {
        entry.present++
      }
      attendanceByStudent.set(att.studentId, entry)
    })

    // Build student list with attendance and class info
    // Include all students, even if they have no attendance records yet
    const studentsWithAttendance = Array.from(studentIds).map(studentId => {
      // Find student from any class
      let student: { id: string; firstName: string; lastName: string } | null = null
      let studentClass: { id: string; name: string } | null = null
      
      for (const cls of teacherClasses) {
        const studentClassItem = cls.StudentClass.find(sc => sc.Student?.id === studentId)
        if (studentClassItem?.Student) {
          student = studentClassItem.Student
          studentClass = cls
          break
        }
      }
      
      if (!student) return null

      const attendance = attendanceByStudent.get(studentId) || { present: 0, total: 0 }
      // If no attendance records, set rate to 0 (new student)
      const attendanceRate = attendance.total > 0
        ? Math.round((attendance.present / attendance.total) * 100)
        : 0

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        className: studentClass?.name || 'No Class',
        attendanceRate
      }
    }).filter((s): s is NonNullable<typeof s> => s !== null)

    // Sort by attendance rate (descending) and take top 5
    // If students have same attendance rate, sort alphabetically by name
    const topStudents = studentsWithAttendance
      .sort((a, b) => {
        if (b.attendanceRate !== a.attendanceRate) {
          return b.attendanceRate - a.attendanceRate
        }
        return a.name.localeCompare(b.name)
      })
      .slice(0, 5)

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('Top attending students', {
        totalStudents: studentsWithAttendance.length,
        topStudents: topStudents.length,
        teacherId: session.user.id
      })
    }

    return NextResponse.json({ students: topStudents })
  } catch (error: any) {
    logger.error('Error fetching top attending students', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch top attending students',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

