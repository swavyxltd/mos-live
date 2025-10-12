'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { AddEventModal } from '@/components/add-event-modal'
import { EventDetailModal } from '@/components/event-detail-modal'
import { CalendarFilters } from '@/components/calendar-filters'
import { isDemoMode } from '@/lib/demo-mode'
import { Plus, Download, Calendar, Clock, MapPin, Users } from 'lucide-react'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  
  // Load demo data immediately - October 2025 onwards with Christmas holidays
  const demoEvents = [
    // October 2025 Events
    {
      id: 'demo-event-1',
      title: 'Quran Recitation - Level 1',
      type: 'CLASS',
      date: new Date('2025-10-01T16:00:00'),
      startTime: '4:00 PM',
      endTime: '5:00 PM',
      location: 'Room A',
      teacher: 'Moulana Omar',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-2',
      title: 'Islamic Studies - Level 2',
      type: 'CLASS',
      date: new Date('2025-10-02T17:00:00'),
      startTime: '5:00 PM',
      endTime: '6:00 PM',
      location: 'Room B',
      teacher: 'Apa Aisha',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-3',
      title: 'Arabic Grammar - Level 3',
      type: 'CLASS',
      date: new Date('2025-10-03T15:00:00'),
      startTime: '3:00 PM',
      endTime: '4:00 PM',
      location: 'Room C',
      teacher: 'Hassan Ali',
      description: 'Advanced Arabic grammar lessons'
    },
    {
      id: 'demo-event-4',
      title: 'Quran Memorization Test',
      type: 'EXAM',
      date: new Date('2025-10-07T14:00:00'),
      startTime: '2:00 PM',
      endTime: '3:00 PM',
      location: 'Main Hall',
      teacher: 'Imam Abdullah',
      description: 'Monthly Quran memorization assessment'
    },
    {
      id: 'demo-event-5',
      title: 'Parent-Teacher Meeting',
      type: 'MEETING',
      date: new Date('2025-10-10T18:00:00'),
      startTime: '6:00 PM',
      endTime: '8:00 PM',
      location: 'Conference Room',
      teacher: 'All Teachers',
      description: 'Monthly parent-teacher conference'
    },
    {
      id: 'demo-event-6',
      title: 'Islamic History - Level 4',
      type: 'CLASS',
      date: new Date('2025-10-15T16:30:00'),
      startTime: '4:30 PM',
      endTime: '5:30 PM',
      location: 'Room D',
      teacher: 'Dr. Fatima Al-Zahra',
      description: 'Study of Islamic civilization and history'
    },
    
    // November 2025 Events
    {
      id: 'demo-event-7',
      title: 'Quran Recitation - Level 2',
      type: 'CLASS',
      date: new Date('2025-11-01T16:00:00'),
      startTime: '4:00 PM',
      endTime: '5:00 PM',
      location: 'Room A',
      teacher: 'Moulana Omar',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-8',
      title: 'Islamic Studies - Level 3',
      type: 'CLASS',
      date: new Date('2025-11-05T17:00:00'),
      startTime: '5:00 PM',
      endTime: '6:00 PM',
      location: 'Room B',
      teacher: 'Apa Aisha',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-9',
      title: 'Arabic Grammar - Level 4',
      type: 'CLASS',
      date: new Date('2025-11-10T15:00:00'),
      startTime: '3:00 PM',
      endTime: '4:00 PM',
      location: 'Room C',
      teacher: 'Hassan Ali',
      description: 'Advanced Arabic grammar lessons'
    },
    {
      id: 'demo-event-10',
      title: 'Midterm Examinations',
      type: 'EXAM',
      date: new Date('2025-11-15T09:00:00'),
      startTime: '9:00 AM',
      endTime: '12:00 PM',
      location: 'Main Hall',
      teacher: 'All Teachers',
      description: 'Midterm examinations for all levels'
    },
    
    // December 2025 Events
    {
      id: 'demo-event-11',
      title: 'Quran Recitation - Level 3',
      type: 'CLASS',
      date: new Date('2025-12-01T16:00:00'),
      startTime: '4:00 PM',
      endTime: '5:00 PM',
      location: 'Room A',
      teacher: 'Moulana Omar',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-12',
      title: 'Islamic Studies - Level 4',
      type: 'CLASS',
      date: new Date('2025-12-05T17:00:00'),
      startTime: '5:00 PM',
      endTime: '6:00 PM',
      location: 'Room B',
      teacher: 'Apa Aisha',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-13',
      title: 'Arabic Grammar - Level 5',
      type: 'CLASS',
      date: new Date('2025-12-10T15:00:00'),
      startTime: '3:00 PM',
      endTime: '4:00 PM',
      location: 'Room C',
      teacher: 'Hassan Ali',
      description: 'Advanced Arabic grammar lessons'
    },
    {
      id: 'demo-event-14',
      title: 'Christmas Holiday Break',
      type: 'HOLIDAY',
      date: new Date('2025-12-23T00:00:00'),
      startTime: 'All Day',
      endTime: 'All Day',
      location: 'School Closed',
      teacher: 'N/A',
      description: 'Christmas holiday break - School closed'
    },
    {
      id: 'demo-event-15',
      title: 'Christmas Day',
      type: 'HOLIDAY',
      date: new Date('2025-12-25T00:00:00'),
      startTime: 'All Day',
      endTime: 'All Day',
      location: 'School Closed',
      teacher: 'N/A',
      description: 'Christmas Day - School closed'
    },
    {
      id: 'demo-event-16',
      title: 'Boxing Day',
      type: 'HOLIDAY',
      date: new Date('2025-12-26T00:00:00'),
      startTime: 'All Day',
      endTime: 'All Day',
      location: 'School Closed',
      teacher: 'N/A',
      description: 'Boxing Day - School closed'
    },
    {
      id: 'demo-event-17',
      title: 'New Year Holiday',
      type: 'HOLIDAY',
      date: new Date('2026-01-01T00:00:00'),
      startTime: 'All Day',
      endTime: 'All Day',
      location: 'School Closed',
      teacher: 'N/A',
      description: 'New Year Day - School closed'
    },
    
    // January 2026 Events
    {
      id: 'demo-event-18',
      title: 'Quran Recitation - Level 4',
      type: 'CLASS',
      date: new Date('2026-01-05T16:00:00'),
      startTime: '4:00 PM',
      endTime: '5:00 PM',
      location: 'Room A',
      teacher: 'Moulana Omar',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-19',
      title: 'Islamic Studies - Level 5',
      type: 'CLASS',
      date: new Date('2026-01-10T17:00:00'),
      startTime: '5:00 PM',
      endTime: '6:00 PM',
      location: 'Room B',
      teacher: 'Apa Aisha',
      description: 'Regular class session'
    },
    {
      id: 'demo-event-20',
      title: 'Arabic Grammar - Level 6',
      type: 'CLASS',
      date: new Date('2026-01-15T15:00:00'),
      startTime: '3:00 PM',
      endTime: '4:00 PM',
      location: 'Room C',
      teacher: 'Hassan Ali',
      description: 'Advanced Arabic grammar lessons'
    },
    {
      id: 'demo-event-21',
      title: 'Final Examinations',
      type: 'EXAM',
      date: new Date('2026-01-20T09:00:00'),
      startTime: '9:00 AM',
      endTime: '12:00 PM',
      location: 'Main Hall',
      teacher: 'All Teachers',
      description: 'Final examinations for all levels'
    }
  ]
  
  const [events, setEvents] = useState<any[]>(demoEvents)
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [filters, setFilters] = useState({
    eventTypes: [] as string[],
    dateRange: 'all'
  })
  const [filteredEvents, setFilteredEvents] = useState<any[]>(demoEvents)
  
  // Force update filteredEvents when events change
  React.useEffect(() => {
    setFilteredEvents(events)
  }, [events])
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  // Demo data is already initialized in the component body above

  // Filter events based on current filters
  useEffect(() => {
    let filtered = [...events]

    // Filter by event types
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => filters.eventTypes.includes(event.type))
    }

    // Filter by date range
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= startOfToday && eventDate <= endOfToday
        })
        break
      case 'week':
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59)
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= startOfWeek && eventDate <= endOfWeek
        })
        break
      case 'month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= startOfMonth && eventDate <= endOfMonth
        })
        break
      case 'next-month':
        const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59)
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date)
          return eventDate >= startOfNextMonth && eventDate <= endOfNextMonth
        })
        break
    }

    setFilteredEvents(filtered)
  }, [events, filters])

  if (loading) {
    return <div>Loading calendar...</div>
  }

  // Skip session check for demo mode
  if (!session?.user && status !== 'loading') {
    return <div>Please sign in to view the calendar.</div>
  }

  // Get upcoming events (next 3 months) from filtered events
  const upcomingEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.date)
    const today = new Date()
    const nextThreeMonths = new Date()
    nextThreeMonths.setMonth(today.getMonth() + 3)
    return eventDate >= today && eventDate <= nextThreeMonths
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
    setEventDetailOpen(true)
  }

  const handleFiltersChange = (newFilters: { eventTypes: string[], dateRange: string }) => {
    setFilters(newFilters)
  }

  const handleEventAdded = (newEvent: any) => {
    setEvents(prev => [...prev, newEvent])
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Calendar</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            View and manage school events, classes, and holidays.
          </p>
        </div>
        <div className="flex space-x-3">
          <AddEventModal onEventAdded={handleEventAdded} />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download ICS
          </Button>
        </div>
      </div>

      {/* Calendar Filters */}
      <CalendarFilters onFiltersChange={handleFiltersChange} />

      {/* Calendar Grid */}
      <CalendarGrid 
        events={filteredEvents.map(event => ({
          ...event,
          date: new Date(event.date)
        }))}
        onEventClick={handleEventClick}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events (Next 3 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(showAllUpcoming ? upcomingEvents : upcomingEvents.slice(0, 10)).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        event.type === 'CLASS' ? 'bg-blue-500' : 
                        event.type === 'EXAM' ? 'bg-yellow-500' : 
                        event.type === 'HOLIDAY' ? 'bg-red-500' : 
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
                          {event.startTime && ` • ${event.startTime}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      event.type === 'CLASS' ? 'default' : 
                      event.type === 'EXAM' ? 'secondary' : 
                      event.type === 'HOLIDAY' ? 'destructive' : 
                      'outline'
                    }>
                      {event.type}
                    </Badge>
                  </div>
                ))}
                {upcomingEvents.length > 10 && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                      className="w-full"
                    >
                      {showAllUpcoming ? 'Show Less' : `Show All (${upcomingEvents.length} events)`}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  CLASS
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">Regular Classes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  EXAM
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">Examinations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  HOLIDAY
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">Holidays & Breaks</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  MEETING
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">Meetings & Events</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />
    </div>
  )
}
