'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

type FilterType = 'week' | 'month' | 'year'

interface AttendanceWeekFilterProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
  onDateRangeChange: (startDate: Date, endDate: Date) => void
  filterType?: FilterType
  onFilterTypeChange?: (type: FilterType) => void
}

export function AttendanceWeekFilter({ 
  currentWeek, 
  onWeekChange, 
  onDateRangeChange,
  filterType: externalFilterType,
  onFilterTypeChange
}: AttendanceWeekFilterProps) {
  const [internalFilterType, setInternalFilterType] = useState<FilterType>('week')
  const [showDateRange, setShowDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const filterType = externalFilterType ?? internalFilterType
  
  const lastDateRangeRef = useRef<{ start: Date; end: Date } | null>(null)
  const isInitialMount = useRef(true)
  
  const handleFilterTypeChange = (type: FilterType) => {
    if (onFilterTypeChange) {
      onFilterTypeChange(type)
    } else {
      setInternalFilterType(type)
    }
  }

  const getWeekStart = (date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const getWeekEnd = (date: Date) => {
    // For attendance, week is Monday-Friday, so end is Friday
    const weekStart = getWeekStart(date)
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 4) // Friday is 4 days after Monday
    end.setHours(23, 59, 59, 999)
    return end
  }

  const getMonthStart = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const getMonthEnd = (date: Date) => {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const getYearStart = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const getYearEnd = (date: Date) => {
    const end = new Date(date.getFullYear(), 11, 31)
    end.setHours(23, 59, 59, 999)
    return end
  }

  const formatWeekRange = (date: Date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    const startFormatted = formatDate(start).substring(0, 5)
    const endFormatted = formatDate(end)
    return `${startFormatted} - ${endFormatted}`
  }

  const formatMonthRange = (date: Date) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
  }

  const formatYearRange = (date: Date) => {
    return date.getFullYear().toString()
  }

  const formatDateRange = (date: Date) => {
    switch (filterType) {
      case 'week':
        return formatWeekRange(date)
      case 'month':
        return formatMonthRange(date)
      case 'year':
        return formatYearRange(date)
      default:
        return formatWeekRange(date)
    }
  }

  const handlePrevious = () => {
    const previous = new Date(currentWeek)
    switch (filterType) {
      case 'week':
        previous.setDate(previous.getDate() - 7)
        break
      case 'month':
        previous.setMonth(previous.getMonth() - 1)
        break
      case 'year':
        previous.setFullYear(previous.getFullYear() - 1)
        break
    }
    onWeekChange(previous)
  }

  const handleNext = () => {
    const next = new Date(currentWeek)
    switch (filterType) {
      case 'week':
        next.setDate(next.getDate() + 7)
        break
      case 'month':
        next.setMonth(next.getMonth() + 1)
        break
      case 'year':
        next.setFullYear(next.getFullYear() + 1)
        break
    }
    
    const today = new Date()
    if (next <= today) {
      onWeekChange(next)
    }
  }

  const handleCurrent = () => {
    onWeekChange(new Date())
  }

  const handleCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate)
      const endDate = new Date(customEndDate)
      const today = new Date()
      
      if (startDate <= today && endDate <= today) {
        onWeekChange(startDate)
        lastDateRangeRef.current = { start: startDate, end: endDate }
        onDateRangeChange(startDate, endDate)
        setShowDateRange(false)
      }
    }
  }

  const handleClearCustomRange = () => {
    setCustomStartDate('')
    setCustomEndDate('')
    setShowDateRange(false)
    const today = new Date()
    onWeekChange(today)
    lastDateRangeRef.current = null
  }

  const getDateRange = (date: Date): { start: Date; end: Date } => {
    switch (filterType) {
      case 'week':
        return { start: getWeekStart(date), end: getWeekEnd(date) }
      case 'month':
        return { start: getMonthStart(date), end: getMonthEnd(date) }
      case 'year':
        return { start: getYearStart(date), end: getYearEnd(date) }
      default:
        return { start: getWeekStart(date), end: getWeekEnd(date) }
    }
  }

  useEffect(() => {
    const { start, end } = getDateRange(currentWeek)
    
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return
    }
    
    const lastRange = lastDateRangeRef.current
    if (
      lastRange &&
      lastRange.start.getTime() === start.getTime() &&
      lastRange.end.getTime() === end.getTime()
    ) {
      return
    }
    
    lastDateRangeRef.current = { start, end }
    onDateRangeChange(start, end)
    
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
  }, [currentWeek, filterType, onDateRangeChange])

  const canNavigateNext = () => {
    const next = new Date(currentWeek)
    switch (filterType) {
      case 'week':
        return new Date(next.getTime() + 7 * 24 * 60 * 60 * 1000) <= new Date()
      case 'month':
        next.setMonth(next.getMonth() + 1)
        return next <= new Date()
      case 'year':
        next.setFullYear(next.getFullYear() + 1)
        return next <= new Date()
      default:
        return false
    }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* View Type Toggle */}
          <div className="flex bg-[var(--muted)] rounded-lg p-1 gap-1">
            {(['week', 'month', 'year'] as FilterType[]).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterTypeChange(type)}
                className="capitalize min-w-[80px] sm:min-w-[70px] text-sm sm:text-sm h-9 sm:h-9 px-3 sm:px-3"
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4 sm:h-4 sm:w-4" />
            </Button>
            
            <div className="px-3 sm:px-3 py-2 sm:py-1.5 bg-[var(--muted)] rounded-lg text-center flex-1 sm:min-w-[140px]">
              <div className="text-sm sm:text-sm font-semibold text-[var(--foreground)]">
                {formatDateRange(currentWeek)}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!canNavigateNext()}
              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="h-10 flex-1 sm:flex-none sm:h-9 sm:px-3 text-sm sm:text-sm"
            >
              Current
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDateRange(!showDateRange)}
              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 flex-shrink-0"
            >
              <Filter className="h-4 w-4 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Custom Date Range */}
        {showDateRange && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-9 flex-1"
              placeholder="Start date"
            />
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-9 flex-1"
              placeholder="End date"
            />
            <Button
              onClick={handleCustomDateRange}
              disabled={!customStartDate || !customEndDate}
              size="sm"
              className="h-9"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={handleClearCustomRange}
              size="sm"
              className="h-9"
            >
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
