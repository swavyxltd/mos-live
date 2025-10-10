'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Filter } from 'lucide-react'

interface CalendarFiltersProps {
  onFiltersChange: (filters: {
    eventTypes: string[]
    dateRange: string
  }) => void
}

export function CalendarFilters({ onFiltersChange }: CalendarFiltersProps) {
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [dateRange, setDateRange] = useState('all')

  const eventTypeOptions = [
    { value: 'CLASS', label: 'Classes' },
    { value: 'EXAM', label: 'Exams' },
    { value: 'HOLIDAY', label: 'Holidays' },
    { value: 'MEETING', label: 'Meetings' },
    { value: 'EVENT', label: 'Events' }
  ]

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'next-month', label: 'Next Month' }
  ]

  const handleEventTypeToggle = (type: string) => {
    const newTypes = eventTypes.includes(type)
      ? eventTypes.filter(t => t !== type)
      : [...eventTypes, type]
    setEventTypes(newTypes)
    onFiltersChange({ eventTypes: newTypes, dateRange })
  }

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    onFiltersChange({ eventTypes, dateRange: range })
  }

  const clearFilters = () => {
    setEventTypes([])
    setDateRange('all')
    onFiltersChange({ eventTypes: [], dateRange: 'all' })
  }

  const hasActiveFilters = eventTypes.length > 0 || dateRange !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--muted)] rounded-[var(--radius-lg)]">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
        <span className="text-sm font-medium text-[var(--foreground)]">Filters:</span>
      </div>

      {/* Event Type Filters */}
      <div className="flex flex-wrap gap-2">
        {eventTypeOptions.map((option) => (
          <Button
            key={option.value}
            variant={eventTypes.includes(option.value) ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleEventTypeToggle(option.value)}
            className="h-8"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">Date:</span>
        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted-foreground)]">Active:</span>
          {eventTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {eventTypeOptions.find(opt => opt.value === type)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleEventTypeToggle(type)}
              />
            </Badge>
          ))}
          {dateRange !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {dateRangeOptions.find(opt => opt.value === dateRange)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleDateRangeChange('all')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
          Clear All
        </Button>
      )}
    </div>
  )
}
