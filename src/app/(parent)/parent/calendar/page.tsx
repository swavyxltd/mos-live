'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { isDemoMode } from '@/lib/demo-mode'
import { Calendar, Download, Clock, MapPin, Users } from 'lucide-react'
import { CardSkeleton, Skeleton } from '@/components/loading/skeleton'

export default function ParentCalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [classSchedules, setClassSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data for calendar
      const demoHolidays = [
        {
          id: 'demo-holiday-1',
          title: 'Christmas Break',
          date: new Date('2024-12-25'),
          type: 'HOLIDAY',
          description: 'School closed for Christmas Day',
          isRecurring: false
        },
        {
          id: 'demo-holiday-2',
          title: 'Boxing Day',
          date: new Date('2024-12-26'),
          type: 'HOLIDAY',
          description: 'School closed for Boxing Day',
          isRecurring: false
        },
        {
          id: 'demo-holiday-3',
          title: 'New Year Holiday',
          date: new Date('2025-01-01'),
          type: 'HOLIDAY',
          description: 'School closed for New Year',
          isRecurring: false
        },
        {
          id: 'demo-holiday-4',
          title: 'Eid al-Fitr',
          date: new Date('2025-03-30'),
          type: 'HOLIDAY',
          description: 'School closed for Eid al-Fitr',
          isRecurring: false
        },
        {
          id: 'demo-holiday-5',
          title: 'Eid al-Adha',
          date: new Date('2025-06-06'),
          type: 'HOLIDAY',
          description: 'School closed for Eid al-Adha',
          isRecurring: false
        }
      ]

      const demoClassSchedules = [
        {
          id: 'demo-schedule-1',
          title: "Ahmed's classes: Monday to Friday 5-7pm",
          dayOfWeek: 'Monday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room A',
          teacher: 'Moulana Omar',
          students: ['Ahmed Hassan'],
          isSummary: true
        },
        {
          id: 'demo-schedule-2',
          title: "Fatima's classes: Monday to Friday 5-7pm",
          dayOfWeek: 'Monday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room B',
          teacher: 'Apa Aisha',
          students: ['Fatima Hassan'],
          isSummary: true
        }
      ]

      // Generate events for the next 30 days
      const today = new Date()
      const next30Days = new Date()
      next30Days.setDate(today.getDate() + 30)

      const demoEvents = []
      
      // Add holidays
      demoHolidays.forEach(holiday => {
        if (holiday.date >= today && holiday.date <= next30Days) {
          demoEvents.push({
            ...holiday,
            date: holiday.date,
            isHoliday: true
          })
        }
      })

      // Add class schedules for the next 30 days
      for (let d = new Date(today); d <= next30Days; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' })
        const dayClasses = demoClassSchedules.filter(schedule => schedule.dayOfWeek === dayOfWeek)
        
        dayClasses.forEach(schedule => {
          const eventDate = new Date(d)
          eventDate.setHours(parseInt(schedule.startTime.split(':')[0]), parseInt(schedule.startTime.split(':')[1]))
          
          // For summary entries, only show once per week (on Monday)
          if (schedule.isSummary && dayOfWeek !== 'Monday') {
            return
          }
          
          demoEvents.push({
            id: schedule.isSummary ? schedule.id : `${schedule.id}-${d.toISOString().split('T')[0]}`,
            title: schedule.title,
            date: eventDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            room: schedule.room,
            teacher: schedule.teacher,
            students: schedule.students,
            type: 'CLASS',
            isHoliday: false,
            isSummary: schedule.isSummary
          })
        })
      }

      // Add some special events
      demoEvents.push(
        // October 2025 Events
        {
          id: 'demo-event-1',
          title: 'Quran Recitation Exam',
          date: new Date('2025-10-20'),
          type: 'EXAM',
          description: 'Quran recitation assessment for all levels',
          isHoliday: false
        },
        {
          id: 'demo-event-2',
          title: 'Islamic Studies Exam',
          date: new Date('2025-10-25'),
          type: 'EXAM',
          description: 'Islamic Studies written examination',
          isHoliday: false
        },
        {
          id: 'demo-event-3',
          title: 'Arabic Grammar Exam',
          date: new Date('2025-10-28'),
          type: 'EXAM',
          description: 'Arabic language and grammar assessment',
          isHoliday: false
        },
        {
          id: 'demo-event-4',
          title: 'Quran Competition',
          date: new Date('2025-10-30'),
          type: 'EVENT',
          description: 'Annual Quran recitation competition',
          isHoliday: false
        },
        // November 2025 Events
        {
          id: 'demo-event-5',
          title: 'Parent-Teacher Meeting',
          date: new Date('2025-11-05'),
          type: 'MEETING',
          description: 'Scheduled meetings with teachers',
          isHoliday: false
        },
        {
          id: 'demo-event-6',
          title: 'Mid-Term Assessment',
          date: new Date('2025-11-15'),
          type: 'EXAM',
          description: 'Mid-term progress assessment',
          isHoliday: false
        },
        {
          id: 'demo-event-7',
          title: 'Islamic History Exam',
          date: new Date('2025-11-20'),
          type: 'EXAM',
          description: 'Islamic History and Seerah examination',
          isHoliday: false
        },
        {
          id: 'demo-event-8',
          title: 'Hadith Studies Exam',
          date: new Date('2025-11-25'),
          type: 'EXAM',
          description: 'Hadith and Sunnah studies assessment',
          isHoliday: false
        },
        // December 2025 Events
        {
          id: 'demo-event-9',
          title: 'Arabic Speaking Exam',
          date: new Date('2025-12-05'),
          type: 'EXAM',
          description: 'Arabic conversation and speaking assessment',
          isHoliday: false
        },
        {
          id: 'demo-event-10',
          title: 'End of Term Exams',
          date: new Date('2025-12-15'),
          type: 'EXAM',
          description: 'Final examinations for all classes',
          isHoliday: false
        },
        {
          id: 'demo-event-11',
          title: 'Parent-Teacher Conference',
          date: new Date('2025-12-18'),
          type: 'MEETING',
          description: 'Progress review meetings with parents',
          isHoliday: false
        },
        // Christmas Holiday Period (2 weeks)
        {
          id: 'demo-holiday-christmas-start',
          title: 'Christmas Holiday Begins',
          date: new Date('2025-12-23'),
          type: 'HOLIDAY',
          description: 'School closed for Christmas holiday period',
          isHoliday: true
        },
        {
          id: 'demo-holiday-christmas-end',
          title: 'Christmas Holiday Ends',
          date: new Date('2026-01-06'),
          type: 'HOLIDAY',
          description: 'School reopens after Christmas holiday',
          isHoliday: true
        },
        // January 2026 Events
        {
          id: 'demo-event-12',
          title: 'New Term Begins',
          date: new Date('2026-01-07'),
          type: 'EVENT',
          description: 'Start of new academic term',
          isHoliday: false
        },
        {
          id: 'demo-event-13',
          title: 'Quran Memorization Exam',
          date: new Date('2026-01-15'),
          type: 'EXAM',
          description: 'Quran memorization assessment',
          isHoliday: false
        },
        {
          id: 'demo-event-14',
          title: 'Islamic Ethics Exam',
          date: new Date('2026-01-20'),
          type: 'EXAM',
          description: 'Islamic Ethics and Character assessment',
          isHoliday: false
        }
      )

      // Sort events by date
      demoEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setHolidays(demoHolidays)
      setClassSchedules(demoClassSchedules)
      setEvents(demoEvents)
      setLoading(false)
    } else {
      // Fetch real data from API
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

      fetch(`/api/parent/calendar?startDate=${startDate}&endDate=${endDate}`)
        .then(async res => {
          if (!res.ok) {
            console.error('Failed to fetch calendar data:', res.status)
            setEvents([])
            setHolidays([])
            setClassSchedules([])
            setLoading(false)
            return
          }
          const data = await res.json()
          
          setHolidays(data.holidays || [])
          setClassSchedules(data.classes || [])
          
          // Process events from API
          const allEvents = data.events || []
          
          // Generate recurring class events from class schedules
          const today = new Date()
          const next30Days = new Date()
          next30Days.setDate(today.getDate() + 30)
          
          const classEvents = []
          
          // Add recurring class events
          if (data.classes && Array.isArray(data.classes)) {
            for (let d = new Date(today); d <= next30Days; d.setDate(d.getDate() + 1)) {
              const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
              
              data.classes.forEach((cls: any) => {
                const schedule = cls.schedule
                if (!schedule) return
                
                // Check if this class runs on this day
                const scheduleDays = Array.isArray(schedule.days) ? schedule.days.map((d: string) => d.toLowerCase()) : []
                if (!scheduleDays.includes(dayOfWeek)) return
                
                // Create event for this class on this day
                const eventDate = new Date(d)
                if (schedule.startTime) {
                  const [hours, minutes] = schedule.startTime.split(':').map(Number)
                  eventDate.setHours(hours || 17, minutes || 0, 0, 0)
                } else {
                  eventDate.setHours(17, 0, 0, 0)
                }
                
                classEvents.push({
                  id: `class-${cls.id}-${d.toISOString().split('T')[0]}`,
                  title: cls.name,
                  date: eventDate,
                  startTime: schedule.startTime || '17:00',
                  endTime: schedule.endTime || '19:00',
                  room: cls.room || 'TBD',
                  teacher: cls.teacher || 'TBD',
                  students: cls.students || [],
                  type: 'CLASS',
                  isHoliday: false
                })
              })
            }
          }
          
          // Transform holidays to events format
          const holidayEvents = (data.holidays || []).map((holiday: any) => ({
            id: holiday.id,
            title: holiday.title || holiday.name,
            date: new Date(holiday.date || holiday.startDate),
            type: 'HOLIDAY',
            isHoliday: true,
            description: holiday.description
          }))
          
          // Transform API events
          const transformedApiEvents = (allEvents || []).map((event: any) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.date),
            type: event.type || 'EVENT',
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            teacher: event.teacher,
            description: event.description,
            isHoliday: event.type === 'HOLIDAY' || event.isHoliday
          }))
          
          // Combine all events
          const combinedEvents = [...transformedApiEvents, ...holidayEvents, ...classEvents]
          
          // Sort events by date
          combinedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          setEvents(combinedEvents)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching calendar data:', err)
          setEvents([])
          setHolidays([])
          setClassSchedules([])
          setLoading(false)
        })
    }
  }, [status])

  if (!session?.user?.id) {
    return null // Will be handled by auth redirect
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <CardSkeleton className="h-96" />
        <CardSkeleton className="h-64" />
      </div>
    )
  }

  // Demo org data
  const org = {
    id: 'demo-org-1',
    name: 'Leicester Islamic Centre',
    slug: 'leicester-islamic-centre'
  }

  const userRole = 'PARENT'

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = new Date(event.date).toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(event)
    return acc
  }, {} as Record<string, any[]>)

  // Get upcoming events (next 3 months) - only holidays and exams, not regular classes
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    const today = new Date()
    const next3Months = new Date()
    next3Months.setMonth(today.getMonth() + 3)
    
    // Only show holidays, exams, and meetings, exclude regular classes
    const isRelevantEvent = event.isHoliday || event.type === 'HOLIDAY' || event.type === 'EXAM' || event.type === 'MEETING'
    
    return eventDate >= today && eventDate <= next3Months && isRelevantEvent
  })

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Calendar</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              View your children's class schedules, holidays, exams, and special events.
            </p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download ICS
          </Button>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events (Next 3 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      event.isHoliday ? 'bg-red-500' : 
                      event.type === 'CLASS' ? 'bg-blue-500' : 
                      event.type === 'EXAM' ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-[var(--foreground)]">{event.title}</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        {event.startTime && ` • ${event.startTime} - ${event.endTime}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    event.isHoliday ? 'destructive' : 
                    event.type === 'CLASS' ? 'default' : 
                    event.type === 'EXAM' ? 'secondary' : 
                    'outline'
                  }>
                    {event.isHoliday ? 'Holiday' : event.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <CalendarGrid 
          events={events.map(event => ({
            ...event,
            date: new Date(event.date)
          }))}
          onEventClick={(event) => {
            // Handle event click - could open a modal or navigate to event details
          }}
        />

        {/* Class Schedule Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Regular Class Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classSchedules.map((schedule) => (
                <div key={schedule.id} className="p-4 border border-[var(--border)] rounded-[var(--radius-md)]">
                  <h4 className="font-medium text-[var(--foreground)] mb-2">{schedule.title}</h4>
                  <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {schedule.dayOfWeek}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {schedule.room}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {schedule.teacher}
                    </div>
                  </div>
                  {schedule.students && schedule.students.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)]">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Your children: {schedule.students.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  )
}