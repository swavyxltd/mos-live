import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
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
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Check if user is a teacher
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

    const isTeacher = membership?.staffSubrole === 'TEACHER'

    if (!isTeacher) {
      return NextResponse.json(
        { error: 'This endpoint is only available for teachers' },
        { status: 403 }
      )
    }

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Get teacher's classes
    const classes = await prisma.class.findMany({
      where: {
        orgId: org.id,
        teacherId: session.user.id,
        isArchived: false
      },
      include: {
        StudentClass: {
          where: {
            Student: {
              isArchived: false
            }
          },
          include: {
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

    // Get today's day name (e.g., "Monday", "Tuesday")
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayDayName = dayNames[today.getDay()]

    // Filter classes that have schedule for today
    const todayClasses = classes.filter(cls => {
      try {
        const schedule = typeof cls.schedule === 'string' 
          ? JSON.parse(cls.schedule) 
          : cls.schedule
        
        if (!schedule?.days || !Array.isArray(schedule.days)) {
          return false
        }
        
        return schedule.days.includes(todayDayName)
      } catch (e) {
        return false
      }
    })

    // Get attendance status for each class
    const classesWithAttendance = await Promise.all(
      todayClasses.map(async (cls) => {
        const studentIds = cls.StudentClass.map(sc => sc.studentId)
        
        if (studentIds.length === 0) {
          return {
            id: cls.id,
            name: cls.name,
            studentCount: 0,
            attendanceStatus: 'NO_STUDENTS' as const
          }
        }

        // Check if attendance is marked for today
        const attendanceRecords = await prisma.attendance.findMany({
          where: {
            classId: cls.id,
            studentId: { in: studentIds },
            date: {
              gte: today,
              lte: todayEnd
            },
            orgId: org.id
          },
          select: {
            studentId: true
          }
        })

        const markedCount = attendanceRecords.length
        const totalStudents = studentIds.length

        let attendanceStatus: 'MARKED' | 'NOT_MARKED' | 'PARTIAL'
        if (markedCount === 0) {
          attendanceStatus = 'NOT_MARKED'
        } else if (markedCount === totalStudents) {
          attendanceStatus = 'MARKED'
        } else {
          attendanceStatus = 'PARTIAL'
        }

        return {
          id: cls.id,
          name: cls.name,
          studentCount: totalStudents,
          attendanceStatus,
          markedCount,
          totalCount: totalStudents
        }
      })
    )

    return NextResponse.json(classesWithAttendance)
  } catch (error: any) {
    console.error('Error fetching today classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch today classes' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

