import { createEvents } from 'ics'
import { prisma } from './prisma'
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'class' | 'holiday' | 'term' | 'exam'
  description?: string
  location?: string
  allDay?: boolean
}

export async function getCalendarEvents(
  orgId: string,
  startDate: Date,
  endDate: Date,
  filters?: {
    types?: string[]
    classIds?: string[]
  }
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []

  // Get classes
  if (!filters?.types || filters.types.includes('class')) {
    const classes = await prisma.class.findMany({
      where: {
        orgId,
        ...(filters?.classIds && { id: { in: filters.classIds } })
      }
    })

    for (const cls of classes) {
      const schedule = cls.schedule as any
      if (schedule?.days && schedule?.startTime && schedule?.endTime) {
        // Generate recurring events for the date range
        const current = new Date(startDate)
        while (current <= endDate) {
          const dayOfWeek = current.getDay()
          const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek]
          
          if (schedule.days.includes(dayName)) {
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
            
            const start = new Date(current)
            start.setHours(startHour, startMinute, 0, 0)
            
            const end = new Date(current)
            end.setHours(endHour, endMinute, 0, 0)
            
            events.push({
              id: `class-${cls.id}-${current.getTime()}`,
              title: cls.name,
              start,
              end,
              type: 'class',
              description: cls.description || undefined,
              location: 'Madrasah'
            })
          }
          
          current.setDate(current.getDate() + 1)
        }
      }
    }
  }

  // Get holidays
  if (!filters?.types || filters.types.includes('holiday')) {
    const holidays = await prisma.holiday.findMany({
      where: {
        orgId,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    })

    for (const holiday of holidays) {
      events.push({
        id: `holiday-${holiday.id}`,
        title: holiday.name,
        start: holiday.startDate,
        end: holiday.endDate,
        type: 'holiday',
        allDay: true
      })
    }
  }

  // Get terms
  if (!filters?.types || filters.types.includes('term')) {
    const terms = await prisma.term.findMany({
      where: {
        orgId,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    })

    for (const term of terms) {
      events.push({
        id: `term-${term.id}`,
        title: term.name,
        start: term.startDate,
        end: term.endDate,
        type: 'term',
        allDay: true
      })
    }
  }

  // Get exams
  if (!filters?.types || filters.types.includes('exam')) {
    const exams = await prisma.exam.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
        ...(filters?.classIds && { classId: { in: filters.classIds } })
      },
      include: {
        class: true
      }
    })

    for (const exam of exams) {
      events.push({
        id: `exam-${exam.id}`,
        title: exam.title,
        start: exam.date,
        end: new Date(exam.date.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        type: 'exam',
        description: exam.notes || undefined,
        location: exam.class?.name || 'Madrasah'
      })
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

export async function generateICS(
  orgId: string,
  months: number = 12
): Promise<string> {
  const startDate = startOfMonth(new Date())
  const endDate = endOfMonth(addMonths(startDate, months - 1))
  
  const events = await getCalendarEvents(orgId, startDate, endDate)
  
  const icsEvents = events.map(event => ({
    title: event.title,
    start: [
      event.start.getFullYear(),
      event.start.getMonth() + 1,
      event.start.getDate(),
      event.start.getHours(),
      event.start.getMinutes()
    ] as [number, number, number, number, number],
    end: [
      event.end.getFullYear(),
      event.end.getMonth() + 1,
      event.end.getDate(),
      event.end.getHours(),
      event.end.getMinutes()
    ] as [number, number, number, number, number],
    description: event.description,
    location: event.location,
    allDay: event.allDay
  }))
  
  const { error, value } = createEvents(icsEvents)
  
  if (error) {
    throw new Error(`ICS generation failed: ${error.message}`)
  }
  
  return value || ''
}

export function getEventTypeColor(type: string): string {
  switch (type) {
    case 'class':
      return 'bg-blue-100 text-blue-800'
    case 'holiday':
      return 'bg-red-100 text-red-800'
    case 'term':
      return 'bg-green-100 text-green-800'
    case 'exam':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day'
  }
  
  const start = format(event.start, 'h:mm a')
  const end = format(event.end, 'h:mm a')
  
  return `${start} - ${end}`
}
