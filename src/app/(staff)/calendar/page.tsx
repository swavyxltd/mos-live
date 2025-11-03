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
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [filters, setFilters] = useState({
    eventTypes: [] as string[],
    dateRange: 'all'
  })
  const [filteredEvents, setFilteredEvents] = useState<any[]>([])
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  // Fetch events
  useEffect(() => {
    if (status === 'loading') return

    const fetchEvents = async () => {
      try {
        setLoading(true)
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

        const response = await fetch(`/api/events?startDate=${startDate}&endDate=${endDate}`)
        if (response.ok) {
          const data = await response.json()
          // Transform API data for frontend
          const transformed = data.map((event: any) => ({
            id: event.id,
            title: event.title,
            type: event.type || 'EVENT',
            date: new Date(event.date),
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            location: event.location || '',
            teacher: event.teacher || '',
            description: event.description || '',
            class: event.class
          }))
          setEvents(transformed)
        } else {
          console.error('Failed to fetch events')
          setEvents([])
        }
      } catch (error) {
        console.error('Error fetching events:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [status])

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
    return <div className="flex items-center justify-center min-h-screen">Loading calendar...</div>
  }

  if (!session?.user && status !== 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Please sign in to view the calendar.</div>
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
