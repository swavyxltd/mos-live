'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter
} from 'lucide-react'

interface AttendanceWeekFilterProps {
  currentWeek: Date
  onWeekChange: (week: Date) => void
  onDateRangeChange: (startDate: Date, endDate: Date) => void
}

export function AttendanceWeekFilter({ 
  currentWeek, 
  onWeekChange, 
  onDateRangeChange 
}: AttendanceWeekFilterProps) {
  const [showDateRange, setShowDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

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

  const formatWeekRange = (date: Date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const handlePreviousWeek = () => {
    const previousWeek = new Date(currentWeek)
    previousWeek.setDate(previousWeek.getDate() - 7)
    onWeekChange(previousWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    // Don't allow future weeks
    const today = new Date()
    if (nextWeek <= today) {
      onWeekChange(nextWeek)
    }
  }

  const handleCurrentWeek = () => {
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

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="text-center min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                {formatWeekRange(currentWeek)}
              </div>
              <div className="text-sm text-gray-500">Week View</div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              disabled={new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000) > new Date()}
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
              onClick={handleCurrentWeek}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              This Week
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
