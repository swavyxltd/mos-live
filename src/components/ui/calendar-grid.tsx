'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime?: string
  endTime?: string
  type: 'CLASS' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'EVENT'
  isHoliday?: boolean
  room?: string
  teacher?: string
  students?: string[]
}

interface CalendarGridProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
}

export function CalendarGrid({ events, onEventClick }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
  const daysInMonth = lastDayOfMonth.getDate()

  // Get days from previous month to fill the grid
  const prevMonth = new Date(year, month - 1, 0)
  const daysFromPrevMonth = firstDayOfWeek

  // Get days from next month to fill the grid
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const daysFromNextMonth = totalCells - (firstDayOfWeek + daysInMonth)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getEventColor = (event: CalendarEvent) => {
    if (event.isHoliday) return 'bg-red-100 text-red-800 border-red-200'
    if (event.type === 'CLASS') return 'bg-blue-100 text-blue-800 border-blue-200'
    if (event.type === 'EXAM') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (event.type === 'MEETING') return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const renderDay = (date: Date, isCurrentMonth: boolean) => {
    const dayEvents = getEventsForDate(date)
    const isToday = date.toDateString() === today.toDateString()
    const isPast = date < today && !isToday

    return (
      <div
        key={date.toISOString()}
        className={cn(
          "min-h-[120px] p-2 border border-[var(--border)] bg-[var(--background)]",
          "hover:bg-[var(--muted)] transition-colors",
          !isCurrentMonth && "text-[var(--muted-foreground)] bg-[var(--muted)]/50",
          isToday && "bg-[var(--primary)]/10 border-[var(--primary)]/20",
          isPast && "opacity-60"
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-sm font-medium",
            isToday && "text-[var(--primary)] font-bold"
          )}>
            {date.getDate()}
          </span>
          {isToday && (
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
          )}
        </div>
        
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className={cn(
                "text-sm p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity",
                getEventColor(event)
              )}
              onClick={() => onEventClick?.(event)}
              title={`${event.title}${event.startTime ? ` (${event.startTime})` : ''}`}
            >
              <div className="truncate font-medium">{event.title}</div>
              {event.startTime && (
                <div className="text-sm opacity-75">{event.startTime}</div>
              )}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-sm text-[var(--muted-foreground)] font-medium">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {dayNames.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Previous month days */}
        {Array.from({ length: daysFromPrevMonth }, (_, i) => {
          const date = new Date(year, month - 1, prevMonth.getDate() - daysFromPrevMonth + i + 1)
          return renderDay(date, false)
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1)
          return renderDay(date, true)
        })}

        {/* Next month days */}
        {Array.from({ length: daysFromNextMonth }, (_, i) => {
          const date = new Date(year, month + 1, i + 1)
          return renderDay(date, false)
        })}
      </div>
    </div>
  )
}
