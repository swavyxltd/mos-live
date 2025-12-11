'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter
} from 'lucide-react'

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
    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const formatMonthRange = (date: Date) => {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
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
        onDateRangeChange(startDate, endDate)
        setShowDateRange(false)
      }
    }
  }

  const handleClearCustomRange = () => {
    setCustomStartDate('')
    setCustomEndDate('')
    setShowDateRange(false)
    onWeekChange(new Date())
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
    onDateRangeChange(start, end)
  }, [currentWeek, filterType])

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="text-center min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                {formatDateRange(currentWeek)}
              </div>
              <div className="text-sm text-gray-500 capitalize">{filterType} View</div>
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
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Current {filterType === 'week' ? 'Week' : filterType === 'month' ? 'Month' : 'Year'}
            </Button>
            
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDateRange(!showDateRange)}
                    className={`flex items-center gap-1 ${
                      showDateRange 
                        ? 'bg-gray-100 border-gray-300 text-gray-900' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    Custom Range
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
