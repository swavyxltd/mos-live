'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Download, Clock, MapPin } from 'lucide-react'
import { CardSkeleton, Skeleton } from '@/components/loading/skeleton'

export default function ParentCalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    // Always fetch real data from API
    const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

      fetch(`/api/parent/calendar?startDate=${startDate}&endDate=${endDate}`)
        .then(async res => {
          if (!res.ok) {
            console.error('Failed to fetch calendar data:', res.status)
            setEvents([])
            setHolidays([])
            setLoading(false)
            return
          }
          const data = await res.json()
          
          setHolidays(data.holidays || [])
          
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
          setLoading(false)
        })
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

  // Get all upcoming events (next 3 months) - only holidays, exams, and meetings, exclude regular classes
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next3Months = new Date()
  next3Months.setMonth(today.getMonth() + 3)
  next3Months.setHours(23, 59, 59, 999)
  
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)
    
    // Only show holidays, exams, meetings, and events - exclude regular classes
    const isRelevantEvent = event.isHoliday || 
                          event.type === 'HOLIDAY' || 
                          event.type === 'EXAM' || 
                          event.type === 'MEETING' ||
                          event.type === 'EVENT'
    
    // Only show future events
    return eventDate >= today && eventDate <= next3Months && isRelevantEvent
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

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

        {/* Upcoming Events List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Holidays, exams, and special events for the next 3 months
            </p>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  No upcoming events scheduled
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const eventDate = new Date(event.date)
                  const isToday = eventDate.toDateString() === today.toDateString()
                  
                  return (
                    <div 
                      key={event.id} 
                      className={`flex items-start justify-between p-4 border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--accent)]/30 transition-all ${
                        isToday ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                          event.isHoliday || event.type === 'HOLIDAY' ? 'bg-red-500' : 
                          event.type === 'EXAM' ? 'bg-yellow-500' : 
                          event.type === 'MEETING' ? 'bg-blue-500' : 
                          'bg-green-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-[var(--foreground)]">{event.title}</h4>
                            {isToday && (
                              <Badge variant="outline" className="text-xs">Today</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {eventDate.toLocaleDateString('en-GB', { 
                                weekday: 'long', 
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                            {event.startTime && (
                              <>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
                              </>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">
                              {event.description}
                            </p>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] mt-1">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={
                          event.isHoliday || event.type === 'HOLIDAY' ? 'destructive' : 
                          event.type === 'EXAM' ? 'secondary' : 
                          'outline'
                        }
                        className="ml-3 flex-shrink-0"
                      >
                        {event.isHoliday || event.type === 'HOLIDAY' ? 'Holiday' : 
                         event.type === 'EXAM' ? 'Exam' :
                         event.type === 'MEETING' ? 'Meeting' :
                         'Event'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
  )
}