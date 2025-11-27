export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/parent/calendar - Get calendar data for parent (events, holidays, classes)
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Verify user is a PARENT in this organization
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (userRole !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    const studentIds = students.map(s => s.id)
    
    // Debug: Log student count
    if (students.length === 0) {
      logger.warn(`No students found for parent ${session.user.id} in org ${org.id}`)
    }
    
    // Query StudentClass directly to ensure we get ALL enrollments
    // This is more reliable than relying on the include in the students query
    const allStudentClasses = studentIds.length > 0 ? await prisma.studentClass.findMany({
      where: {
        orgId: org.id,
        studentId: { in: studentIds }
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true,
            isArchived: true
          }
        },
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryParentId: true
          }
        }
      }
    }) : []
    
    // Filter out enrollments for archived classes
    const activeEnrollments = allStudentClasses.filter(sc => 
      sc.Class && !sc.Class.isArchived && sc.Student && studentIds.includes(sc.Student.id)
    )
    
    // Get all unique class IDs from active enrollments
    const classIds = Array.from(new Set(
      activeEnrollments.map(sc => sc.classId)
    )).filter(id => id) // Remove any null/undefined values
    
    // Debug: Log enrollment info
    if (activeEnrollments.length === 0 && students.length > 0) {
      logger.warn(`Parent ${session.user.id} has ${students.length} students but no active class enrollments`)
    } else if (students.length > 0) {
      logger.warn(`Parent ${session.user.id}: ${students.length} students, ${activeEnrollments.length} enrollments, ${classIds.length} classes`)
      // Log student names to help debug
      const studentNames = students.map(s => `${s.firstName} ${s.lastName}`).join(', ')
      logger.warn(`Students: ${studentNames}`)
    }

    // Get date range
    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 3, 0)

    // Fetch events (only for classes the parent's children are in, or general events, or meetings for this parent's children)
    // classId: null means the event is visible to ALL accounts in the org (created by admins)
    // classId: { in: classIds } means the event is for specific classes the parent's children are in
    // studentId: { in: studentIds } means the event is a meeting for one of this parent's children
    const events = await prisma.event.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lte: end
        },
        OR: [
          ...(classIds.length > 0 ? [
            { classId: { in: classIds } }, // Events for parent's children's classes
          ] : []),
          { classId: null, type: { not: 'MEETING' } }, // General events visible to all (but not meetings)
          ...(studentIds.length > 0 ? [
            { studentId: { in: studentIds }, type: 'MEETING' } // Meetings for this parent's children
          ] : [])
        ]
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Fetch exams (only for classes the parent's children are in)
    const exams = classIds.length > 0 ? await prisma.exam.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lte: end
        },
        classId: { in: classIds }
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    }) : []

    // Fetch holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        orgId: org.id,
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    })

    // Get classes the parent's children are enrolled in
    // If no classIds, return empty array (parent's children aren't enrolled in any classes)
    const classes = classIds.length > 0 ? await prisma.class.findMany({
      where: {
        orgId: org.id,
        id: { in: classIds },
        isArchived: false
      },
      include: {
        User: {
          select: {
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }) : []
    
    // Build a map of classId -> students enrolled for this parent
    // Use the activeEnrollments we queried directly to ensure accuracy
    const classStudentsMap = new Map<string, Array<{id: string, firstName: string, lastName: string}>>()
    activeEnrollments.forEach(sc => {
      if (!sc.Class || !sc.Student) return
      const classId = sc.classId
      if (!classId) return
      if (!classStudentsMap.has(classId)) {
        classStudentsMap.set(classId, [])
      }
      classStudentsMap.get(classId)!.push({
        id: sc.Student.id,
        firstName: sc.Student.firstName || '',
        lastName: sc.Student.lastName || ''
      })
    })

    // Transform data for frontend
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      type: event.type || 'EVENT',
      date: event.date instanceof Date ? event.date.toISOString() : event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      teacher: event.teacher,
      description: event.description,
      class: event.Class
    }))

    const transformedExams = exams.map(exam => ({
      id: exam.id,
      title: exam.title,
      type: 'EXAM',
      date: exam.date instanceof Date ? exam.date.toISOString() : exam.date,
      description: exam.notes,
      class: exam.Class
    }))

    const transformedHolidays = holidays.map(holiday => ({
      id: holiday.id,
      title: holiday.name,
      type: 'HOLIDAY',
      date: holiday.startDate instanceof Date ? holiday.startDate.toISOString() : holiday.startDate,
      endDate: holiday.endDate instanceof Date ? holiday.endDate.toISOString() : holiday.endDate,
      isHoliday: true
    }))

    const transformedClasses = classes.map(cls => {
      let schedule: any = {}
      try {
        schedule = typeof cls.schedule === 'string' ? JSON.parse(cls.schedule) : (cls.schedule || {})
      } catch {
        schedule = {}
      }
      
      // Format days of week properly - show all days if multiple
      const scheduleDays = Array.isArray(schedule?.days) ? schedule.days : []
      const formattedDays = scheduleDays.map((day: string) => {
        return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
      })
      const dayOfWeekDisplay = formattedDays.length > 0 
        ? formattedDays.join(', ')
        : 'Not scheduled'
      
      // Get students for this class from our map (ensures we have all enrollments)
      const classStudents = classStudentsMap.get(cls.id) || []
      const studentNames = classStudents.map(s => `${s.firstName} ${s.lastName}`)
      
      return {
        id: cls.id,
        name: cls.name,
        title: cls.name,
        description: cls.description,
        schedule: schedule,
        days: scheduleDays, // Keep original for processing
        dayOfWeek: dayOfWeekDisplay, // Display all days
        startTime: schedule?.startTime || '17:00',
        endTime: schedule?.endTime || '19:00',
        room: schedule?.room || 'TBD',
        teacher: cls.User?.name || 'TBD',
        students: studentNames
      }
    })

    // Combine all events
    const allEvents = [
      ...transformedEvents,
      ...transformedExams,
      ...transformedHolidays
    ]

    return NextResponse.json({
      events: allEvents,
      holidays: transformedHolidays,
      classes: transformedClasses
    })
  } catch (error: any) {
    logger.error('Error fetching parent calendar data', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar data',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

