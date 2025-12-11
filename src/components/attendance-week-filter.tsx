'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  
  // Use refs to track the last date range we sent to prevent infinite loops
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
    return start
  }

  const getWeekEnd = (date: Date) => {
    const end = new Date(date)
    const day = end.getDay()
    const diff = end.getDate() - day + (day === 0 ? 0 : 7) - (day === 0 ? 6 : 1) // Sunday
    end.setDate(diff)
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
    // Format as dd/mm - dd/mm/yyyy
    const startFormatted = formatDate(start).substring(0, 5) // Get dd/mm part
    const endFormatted = formatDate(end) // Get full dd/mm/yyyy
    return `${startFormatted} - ${endFormatted}`
  }

  const formatMonthRange = (date: Date) => {
    // Format as "Month YYYY" but keep dd/mm/yyyy for consistency
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
    
    // Don't allow future dates
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
      
      // Don't allow future dates
      if (startDate <= today && endDate <= today) {
        // Update the week to match the start date
        onWeekChange(startDate)
        // Update the date range ref to prevent duplicate calls
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
    // Reset the date range ref
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

  // Update date range when filter type or date changes
  useEffect(() => {
    const { start, end } = getDateRange(currentWeek)
    
    // Only call if dates are valid
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return
    }
    
    // Check if the date range has actually changed
    const lastRange = lastDateRangeRef.current
    if (
      lastRange &&
      lastRange.start.getTime() === start.getTime() &&
      lastRange.end.getTime() === end.getTime()
    ) {
      // Date range hasn't changed, don't call onDateRangeChange
      return
    }
    
    // Update the ref with the new date range
    lastDateRangeRef.current = { start, end }
    
    // Always call onDateRangeChange, but the ref check prevents duplicate calls
    // The parent's useCallback ensures this function is stable
    onDateRangeChange(start, end)
    
    // Mark that we've completed the initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
    }
  }, [currentWeek, filterType, onDateRangeChange])

  return (
    <Card className="mb-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Top Row: Filter Type and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Type Selector */}
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(value) => handleFilterTypeChange(value as FilterType)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Current </span>
                {filterType === 'week' ? 'Week' : filterType === 'month' ? 'Month' : 'Year'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateRange(!showDateRange)}
                className={`flex items-center gap-1.5 whitespace-nowrap ${
                  showDateRange 
                    ? 'bg-gray-100 border-gray-300 text-gray-900' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Custom </span>Range
              </Button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-center gap-3 px-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            <div className="text-center min-w-0 flex-1 px-4">
              <div className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                {formatDateRange(currentWeek)}
              </div>
              <div className="text-xs sm:text-sm text-[var(--muted-foreground)] capitalize mt-0.5">
                {filterType} View
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={
                (() => {
                  const next = new Date(currentWeek)
                  switch (filterType) {
                    case 'week':
                      return new Date(next.getTime() + 7 * 24 * 60 * 60 * 1000) > new Date()
                    case 'month':
                      next.setMonth(next.getMonth() + 1)
                      return next > new Date()
                    case 'year':
                      next.setFullYear(next.getFullYear() + 1)
                      return next > new Date()
                    default:
                      return false
                  }
                })()
              }
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {showDateRange && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-300 bg-white"
                      />
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-300 bg-white"
                      />
              </div>
              
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleCustomDateRange}
                  disabled={!customStartDate || !customEndDate}
                  size="sm"
                  className="px-4"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearCustomRange}
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
