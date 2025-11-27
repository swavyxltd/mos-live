'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddEventModal } from '@/components/add-event-modal'
import { EventDetailModal } from '@/components/event-detail-modal'
import { Download, Calendar, Clock, MapPin } from 'lucide-react'
import { RestrictedAction } from '@/components/restricted-action'
import { PageSkeleton } from '@/components/loading/skeleton'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)

  // Fetch events, holidays, and exams
  useEffect(() => {
    if (status === 'loading') return

    const fetchCalendarData = async () => {
      try {
        setLoading(true)
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

        const response = await fetch(`/api/staff/calendar?startDate=${startDate}&endDate=${endDate}`)
        if (response.ok) {
          const data = await response.json()
          
          // Transform all events for frontend
          const allEvents = (data.events || []).map((event: any) => ({
            id: event.id,
            title: event.title,
            type: event.type || 'EVENT',
            date: new Date(event.date),
            endDate: event.endDate ? new Date(event.endDate) : null,
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            location: event.location || '',
            teacher: event.teacher || '',
            description: event.description || '',
            class: event.class,
            isHoliday: event.isHoliday || event.type === 'HOLIDAY'
          }))
          
          setEvents(allEvents)
        } else {
          setEvents([])
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchCalendarData()
  }, [status])

  if (loading) {
    return <PageSkeleton />
  }

  if (!session?.user && status !== 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to view the calendar.</div>
  }

  // Get all upcoming events (next 3 months) - only holidays, exams, meetings, and events, exclude regular classes
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

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
    setEventDetailOpen(true)
  }

  const handleEventAdded = async () => {
    // Refetch calendar data after adding event
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

    try {
      const response = await fetch(`/api/staff/calendar?startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        const allEvents = (data.events || []).map((event: any) => ({
          id: event.id,
          title: event.title,
          type: event.type || 'EVENT',
          date: new Date(event.date),
          endDate: event.endDate ? new Date(event.endDate) : null,
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          location: event.location || '',
          teacher: event.teacher || '',
          description: event.description || '',
          class: event.class,
          isHoliday: event.isHoliday || event.type === 'HOLIDAY'
        }))
        setEvents(allEvents)
      }
    } catch (error) {
      console.error('Error refreshing calendar data:', error)
    }
  }

  const handleEventUpdated = (updatedEvent: any) => {
    setEvents(prev => prev.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ))
  }

  const handleEventDeleted = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
    setEventDetailOpen(false)
    setSelectedEvent(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Calendar</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            View and manage school events, holidays, exams, and special events.
          </p>
        </div>
        <div className="flex space-x-3">
          <RestrictedAction action="schedule">
            <AddEventModal onEventAdded={handleEventAdded} />
          </RestrictedAction>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download ICS
          </Button>
        </div>
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
                    className={`flex items-start justify-between p-4 border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--accent)]/30 transition-all cursor-pointer ${
                      isToday ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : ''
                    }`}
                    onClick={() => handleEventClick(event)}
                  >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                          event.isHoliday || event.type === 'HOLIDAY' ? 'bg-green-500' : 
                          event.type === 'EXAM' ? 'bg-yellow-500' : 
                          event.type === 'MEETING' ? 'bg-blue-500' : 
                          'bg-purple-500'
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
                            {event.endDate && (event.isHoliday || event.type === 'HOLIDAY') ? (
                              // Show date range for holidays
                              (() => {
                                const startDate = eventDate
                                const endDate = new Date(event.endDate)
                                const startFormatted = startDate.toLocaleDateString('en-GB', { 
                                  weekday: 'long', 
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })
                                const endFormatted = endDate.toLocaleDateString('en-GB', { 
                                  weekday: 'long', 
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })
                                return `${startFormatted} - ${endFormatted}`
                              })()
                            ) : (
                              eventDate.toLocaleDateString('en-GB', { 
                                weekday: 'long', 
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })
                            )}
                          </span>
                          {event.startTime && !event.isHoliday && (
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
                        {event.class && (
                          <div className="text-sm text-[var(--muted-foreground)] mt-1">
                            <span className="font-medium">Class:</span> {event.class.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`ml-3 flex-shrink-0 ${
                        event.isHoliday || event.type === 'HOLIDAY' ? 'border-green-500 text-green-700 bg-green-50' : 
                        event.type === 'EXAM' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 
                        event.type === 'MEETING' ? 'border-blue-500 text-blue-700 bg-blue-50' : 
                        'border-purple-500 text-purple-700 bg-purple-50'
                      }`}
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

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        onEventUpdated={handleEventAdded}
        onEventDeleted={handleEventAdded}
      />
    </div>
  )
}
