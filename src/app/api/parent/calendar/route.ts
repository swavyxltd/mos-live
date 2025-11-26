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
    const classIds = students.flatMap(s => s.StudentClass.map(sc => sc.classId))

    // Get date range
    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 3, 0)

    // Fetch events (only for classes the parent's children are in, or general events)
    const events = await prisma.event.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lte: end
        },
        OR: [
          { classId: { in: classIds } },
          { classId: null }
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
    const exams = await prisma.exam.findMany({
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
    })

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
    const classes = await prisma.class.findMany({
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
        },
        StudentClass: {
          where: {
            studentId: { in: studentIds }
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
      },
      orderBy: { name: 'asc' }
    })

    // Transform data for frontend
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      type: event.type || 'EVENT',
      date: event.date,
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
      date: exam.date,
      description: exam.notes,
      class: exam.Class
    }))

    const transformedHolidays = holidays.map(holiday => ({
      id: holiday.id,
      title: holiday.name,
      type: 'HOLIDAY',
      date: holiday.startDate,
      endDate: holiday.endDate,
      isHoliday: true
    }))

    const transformedClasses = classes.map(cls => {
      let schedule: any = {}
      try {
        schedule = typeof cls.schedule === 'string' ? JSON.parse(cls.schedule) : (cls.schedule || {})
      } catch {
        schedule = {}
      }
      
      return {
        id: cls.id,
        name: cls.name,
        title: cls.name,
        description: cls.description,
        schedule: schedule,
        dayOfWeek: Array.isArray(schedule?.days) && schedule.days.length > 0 
          ? schedule.days[0].charAt(0).toUpperCase() + schedule.days[0].slice(1)
          : 'Monday',
        startTime: schedule?.startTime || '17:00',
        endTime: schedule?.endTime || '19:00',
        room: schedule?.room || 'TBD',
        teacher: cls.User?.name || 'TBD',
        students: cls.StudentClass.map(sc => `${sc.Student.firstName} ${sc.Student.lastName}`)
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

