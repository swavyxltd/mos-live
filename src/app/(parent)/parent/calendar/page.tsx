'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Page } from '@/components/shell/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { isDemoMode } from '@/lib/demo-mode'
import { Calendar, Download, Clock, MapPin, Users } from 'lucide-react'

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
          title: 'Quran Recitation - Level 1',
          dayOfWeek: 'Monday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room A',
          teacher: 'Omar Khan',
          students: ['Ahmed Hassan']
        },
        {
          id: 'demo-schedule-2',
          title: 'Islamic Studies - Level 2',
          dayOfWeek: 'Monday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room B',
          teacher: 'Aisha Patel',
          students: ['Fatima Hassan']
        },
        {
          id: 'demo-schedule-3',
          title: 'Quran Recitation - Level 1',
          dayOfWeek: 'Wednesday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room A',
          teacher: 'Omar Khan',
          students: ['Ahmed Hassan']
        },
        {
          id: 'demo-schedule-4',
          title: 'Islamic Studies - Level 2',
          dayOfWeek: 'Wednesday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room B',
          teacher: 'Aisha Patel',
          students: ['Fatima Hassan']
        },
        {
          id: 'demo-schedule-5',
          title: 'Quran Recitation - Level 1',
          dayOfWeek: 'Friday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room A',
          teacher: 'Omar Khan',
          students: ['Ahmed Hassan']
        },
        {
          id: 'demo-schedule-6',
          title: 'Islamic Studies - Level 2',
          dayOfWeek: 'Friday',
          startTime: '17:00',
          endTime: '19:00',
          room: 'Room B',
          teacher: 'Aisha Patel',
          students: ['Fatima Hassan']
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
          
          demoEvents.push({
            id: `${schedule.id}-${d.toISOString().split('T')[0]}`,
            title: schedule.title,
            date: eventDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            room: schedule.room,
            teacher: schedule.teacher,
            students: schedule.students,
            type: 'CLASS',
            isHoliday: false
          })
        })
      }

      // Add some special events
      demoEvents.push(
        {
          id: 'demo-event-1',
          title: 'End of Term Exams',
          date: new Date('2024-12-20'),
          type: 'EXAM',
          description: 'Final examinations for all classes',
          isHoliday: false
        },
        {
          id: 'demo-event-2',
          title: 'Parent-Teacher Meeting',
          date: new Date('2024-12-18'),
          type: 'MEETING',
          description: 'Scheduled meetings with teachers',
          isHoliday: false
        },
        {
          id: 'demo-event-3',
          title: 'Quran Competition',
          date: new Date('2024-12-15'),
          type: 'EVENT',
          description: 'Annual Quran recitation competition',
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
      Promise.all([
        fetch('/api/calendar/holidays').then(res => res.json()),
        fetch('/api/calendar/classes').then(res => res.json())
      ]).then(([holidaysData, classesData]) => {
        setHolidays(holidaysData)
        setClassSchedules(classesData)
        
        // Generate events from database data
        const today = new Date()
        const next30Days = new Date()
        next30Days.setDate(today.getDate() + 30)
        
        const dbEvents = []
        
        // Add holidays
        holidaysData.forEach((holiday: any) => {
          dbEvents.push({
            ...holiday,
            isHoliday: true
          })
        })

        // Add class schedules
        for (let d = new Date(today); d <= next30Days; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' })
          const dayClasses = classesData.filter((schedule: any) => 
            schedule.schedule?.includes(dayOfWeek)
          )
          
          dayClasses.forEach((schedule: any) => {
            const eventDate = new Date(d)
            // Parse schedule to get time (assuming format like "Monday, Wednesday, Friday 5:00 PM - 7:00 PM")
            const timeMatch = schedule.schedule?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
            if (timeMatch) {
              let hours = parseInt(timeMatch[1])
              const minutes = parseInt(timeMatch[2])
              const ampm = timeMatch[3].toUpperCase()
              
              if (ampm === 'PM' && hours !== 12) hours += 12
              if (ampm === 'AM' && hours === 12) hours = 0
              
              eventDate.setHours(hours, minutes)
            }
            
            dbEvents.push({
              id: `${schedule.id}-${d.toISOString().split('T')[0]}`,
              title: schedule.name,
              date: eventDate,
              room: schedule.room,
              students: schedule.studentClasses?.map((sc: any) => `${sc.student.firstName} ${sc.student.lastName}`) || [],
              type: 'CLASS',
              isHoliday: false
            })
          })
        }

        // Sort events by date
        dbEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setEvents(dbEvents)
        setLoading(false)
      }).catch(err => {
        console.error('Error fetching calendar data:', err)
        setLoading(false)
      })
    }
  }, [status])

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to view the calendar.</div>
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

  // Get upcoming events (next 7 days)
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    return eventDate >= today && eventDate <= nextWeek
  })

  return (
    <Page 
      user={session.user} 
      org={org} 
      userRole={userRole}
      title="Calendar"
      breadcrumbs={[{ label: 'Calendar' }]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Calendar</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              View your children's class schedules, holidays, and upcoming events.
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
            <CardTitle>Upcoming Events (Next 7 Days)</CardTitle>
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
            console.log('Event clicked:', event)
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
                      <p className="text-xs text-[var(--muted-foreground)]">
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
    </Page>
  )
}