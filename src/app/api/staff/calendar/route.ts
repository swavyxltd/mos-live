export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/staff/calendar - Get calendar data for staff/admin (events, holidays, exams)
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get date range
    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 3, 0)

    // Fetch events (all events for the org)
    const events = await prisma.event.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lte: end
        }
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

    // Fetch exams (all exams for the org)
    const exams = await prisma.exam.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: start,
          lte: end
        }
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

    // Combine all events
    const allEvents = [
      ...transformedEvents,
      ...transformedExams,
      ...transformedHolidays
    ]

    return NextResponse.json({
      events: allEvents,
      holidays: transformedHolidays,
      exams: transformedExams
    })
  } catch (error: any) {
    logger.error('Error fetching staff calendar data', error)
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

