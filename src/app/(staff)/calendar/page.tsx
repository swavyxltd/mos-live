'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddEventModal } from '@/components/add-event-modal'
import { EventDetailModal } from '@/components/event-detail-modal'
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { RestrictedAction } from '@/components/restricted-action'
import { PageSkeleton } from '@/components/loading/skeleton'

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

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
            isHoliday: event.isHoliday || event.type === 'HOLIDAY',
            status: event.status || 'APPROVED' // Include status for pending badge
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

  // Fetch pending event requests (admin only)
  useEffect(() => {
    if (status === 'loading') return

    const fetchPendingRequests = async () => {
      try {
        setPendingLoading(true)
        const response = await fetch('/api/events/pending')
        if (response.ok) {
          const data = await response.json()
          setPendingRequests(data)
        } else {
          setPendingRequests([])
        }
      } catch (error) {
        console.error('Error fetching pending requests:', error)
        setPendingRequests([])
      } finally {
        setPendingLoading(false)
      }
    }

    // Only fetch if user is admin (check via session roleHints)
    const isAdmin = session?.user?.roleHints?.orgAdminOf?.length > 0 || 
                   session?.user?.isSuperAdmin
    if (isAdmin) {
      fetchPendingRequests()
    }
  }, [status, session])

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

  const isAdmin = session?.user?.roleHints?.orgAdminOf?.length > 0 || session?.user?.isSuperAdmin

  const handleReviewEvent = async (eventId: string, action: 'approve' | 'decline') => {
    try {
      const response = await fetch(`/api/events/${eventId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        // Refresh pending requests
        const pendingResponse = await fetch('/api/events/pending')
        if (pendingResponse.ok) {
          const data = await pendingResponse.json()
          setPendingRequests(data)
        }
        // Refresh calendar data
        handleEventAdded()
      } else {
        const error = await response.json()
        console.error('Error reviewing event:', error)
      }
    } catch (error) {
      console.error('Error reviewing event:', error)
    }
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
        </div>
      </div>

      {/* Pending Event Requests Notification (Admin Only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <CardTitle className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                Pending Event Requests ({pendingRequests.length})
              </CardTitle>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              Review and approve or decline event requests from teachers
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-3 bg-white dark:bg-[var(--background)] rounded-lg border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[var(--foreground)]">{request.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {request.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">
                      {new Date(request.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      {request.startTime && ` • ${request.startTime}${request.endTime ? ` - ${request.endTime}` : ''}`}
                    </p>
                    {request.Class && (
                      <p className="text-sm text-[var(--muted-foreground)] mb-1">
                        Class: {request.Class.name}
                      </p>
                    )}
                    {request.creator && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Requested by: {request.creator.name || request.creator.email}
                      </p>
                    )}
                    {request.description && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-2">
                        {request.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                      onClick={() => handleReviewEvent(request.id, 'approve')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => handleReviewEvent(request.id, 'decline')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div>
              {upcomingEvents.map((event, index) => {
                const eventDate = new Date(event.date)
                const isToday = eventDate.toDateString() === today.toDateString()
                
                return (
                  <div key={event.id}>
                    <div 
                      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 hover:bg-[var(--accent)]/30 transition-all cursor-pointer ${
                        isToday ? 'bg-[var(--primary)]/5' : ''
                      }`}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                          event.isHoliday || event.type === 'HOLIDAY' ? 'bg-green-500' : 
                          event.type === 'EXAM' ? 'bg-yellow-500' : 
                          event.type === 'MEETING' ? 'bg-blue-500' : 
                          'bg-purple-500'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h4 className="font-semibold text-[var(--foreground)] break-words">{event.title}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isToday && (
                              <Badge variant="outline" className="text-xs">Today</Badge>
                            )}
                            {event.status === 'PENDING' && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-400">
                                Pending Approval
                              </Badge>
                            )}
                            <Badge 
                              variant="outline"
                              className={`sm:hidden ${
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
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-[var(--muted-foreground)] mb-1">
                          <div className="flex items-start sm:items-center gap-2">
                            <Calendar className="h-3 w-3 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <span className="break-words">
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
                                  return (
                                    <>
                                      <span className="sm:hidden">
                                        {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {startFormatted} - {endFormatted}
                                      </span>
                                    </>
                                  )
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
                          </div>
                          {event.startTime && !event.isHoliday && (
                            <div className="flex items-center gap-2">
                              <span className="hidden sm:inline">•</span>
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}</span>
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1 break-words">
                            {event.description}
                          </p>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] mt-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="break-words">{event.location}</span>
                          </div>
                        )}
                        {event.class && (
                          <div className="text-sm text-[var(--muted-foreground)] mt-1 break-words">
                            <span className="font-medium">Class:</span> {event.class.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 ml-3 flex-shrink-0">
                      {event.status === 'PENDING' && (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-400">
                          Pending Approval
                        </Badge>
                      )}
                      <Badge 
                        variant="outline"
                        className={`${
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
                    </div>
                    {index < upcomingEvents.length - 1 && (
                      <div className="border-b border-[var(--border)]" />
                    )}
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
