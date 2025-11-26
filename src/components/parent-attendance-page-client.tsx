'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Minus
} from 'lucide-react'
import { getAttendanceRating } from '@/lib/attendance-ratings'

interface AttendanceDay {
  day: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
  time?: string
}

interface WeeklyAttendance {
  week: string
  present: number
  absent: number
  late: number
}

interface MonthlyAttendance {
  month: string
  present: number
  absent: number
  late: number
}

interface ChildAttendance {
  id: string
  name: string
  class: string
  teacher: string
  overallAttendance: number
  weeklyAttendance: AttendanceDay[]
  monthlyAttendance: WeeklyAttendance[]
  yearlyAttendance: MonthlyAttendance[]
}

interface ParentAttendancePageClientProps {
  attendanceData: ChildAttendance[]
}

type ViewType = 'week' | 'month' | 'year'

export function ParentAttendancePageClient({ attendanceData }: ParentAttendancePageClientProps) {
  const [viewType, setViewType] = useState<ViewType>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedChild, setSelectedChild] = useState<ChildAttendance | null>(null)

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

  const formatDateRange = (date: Date, view: ViewType) => {
    switch (view) {
      case 'week':
        const weekStart = getWeekStart(date)
        const weekEnd = getWeekEnd(date)
        return `${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
      case 'month':
        return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      case 'year':
        return date.getFullYear().toString()
      default:
        return ''
    }
  }

  const canNavigateNext = (date: Date, view: ViewType) => {
    const today = new Date()
    const nextDate = new Date(date)
    
    switch (view) {
      case 'week':
        nextDate.setDate(nextDate.getDate() + 7)
        return nextDate <= today
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + 1)
        return nextDate <= today
      case 'year':
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        return nextDate <= today
      default:
        return false
    }
  }

  const handlePrevious = () => {
    const newDate = new Date(currentDate)
    switch (viewType) {
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1)
        break
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    if (canNavigateNext(currentDate, viewType)) {
      const newDate = new Date(currentDate)
      switch (viewType) {
        case 'week':
          newDate.setDate(newDate.getDate() + 7)
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1)
          break
        case 'year':
          newDate.setFullYear(newDate.getFullYear() + 1)
          break
      }
      setCurrentDate(newDate)
    }
  }

  const handleCurrent = () => {
    setCurrentDate(new Date())
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusDot = (status: string, day: string, time?: string) => {
    const baseClasses = "w-4 h-4 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
    const tooltipText = status === 'LATE' && time 
      ? `${day}: ${status} (arrived at ${time})`
      : `${day}: ${status}`
    
    switch (status) {
      case 'PRESENT':
        return (
          <div 
            className={`${baseClasses} bg-green-500 hover:bg-green-600`}
            title={tooltipText}
          />
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 hover:bg-red-600`}
            title={tooltipText}
          />
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600`}
            title={tooltipText}
          />
        )
      case 'NOT_SCHEDULED':
        // Check if this is a future day
        const dayDate = new Date(day.split(' ')[1] || '') // Try to parse date from tooltip
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isFuture = dayDate && dayDate > today
        
        return (
          <div 
            className={`${baseClasses} ${isFuture ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-300 hover:bg-gray-400'}`}
            title={isFuture ? `${day}: Upcoming` : `${day}: Not scheduled`}
          />
        )
      default:
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={`${day}: Unknown status`}
          />
        )
    }
  }


  const calculatePeriodAttendance = (child: ChildAttendance, view: ViewType) => {
    switch (view) {
      case 'week':
        const weekTotal = child.weeklyAttendance.length
        const weekPresent = child.weeklyAttendance.filter(day => 
          day.status === 'PRESENT' || day.status === 'LATE'
        ).length
        return weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0

      case 'month':
        const monthTotal = child.monthlyAttendance.reduce((sum, week) => 
          sum + week.present + week.absent + week.late, 0
        )
        const monthPresent = child.monthlyAttendance.reduce((sum, week) => 
          sum + week.present + week.late, 0
        )
        return monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0

      case 'year':
        const yearTotal = child.yearlyAttendance.reduce((sum, month) => 
          sum + month.present + month.absent + month.late, 0
        )
        const yearPresent = child.yearlyAttendance.reduce((sum, month) => 
          sum + month.present + month.late, 0
        )
        return yearTotal > 0 ? Math.round((yearPresent / yearTotal) * 100) : 0

      default:
        return child.overallAttendance
    }
  }

  const renderWeekView = (child: ChildAttendance) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'week')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {child.weeklyAttendance.map((day, index) => {
          const dayDate = new Date(day.date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const isFuture = dayDate > today
          const isPast = dayDate < today
          
          return (
            <div key={index} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">{day.day}</div>
              {getStatusDot(day.status, day.day, day.time)}
              <div className="text-sm text-gray-500 text-center">
                {day.status === 'PRESENT' || day.status === 'LATE' 
                  ? day.time 
                  : day.status === 'NOT_SCHEDULED' && isFuture
                  ? 'Upcoming'
                  : day.status}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderMonthView = (child: ChildAttendance) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'month')}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {child.monthlyAttendance.map((week, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">{week.week}</div>
              <div className="text-sm text-gray-500">
                {week.present + week.absent + week.late} days
              </div>
            </div>
            
            {/* Week dots representation */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 min-w-0">Days:</span>
              <div className="flex gap-1">
                {/* Present dots */}
                {Array.from({ length: week.present }).map((_, i) => (
                  <div 
                    key={`present-${i}`}
                    className="w-3 h-3 rounded-full bg-green-500"
                    title={`Present - Day ${i + 1}`}
                  />
                ))}
                {/* Late dots */}
                {Array.from({ length: week.late }).map((_, i) => (
                  <div 
                    key={`late-${i}`}
                    className="w-3 h-3 rounded-full bg-yellow-500"
                    title={`Late - Day ${week.present + i + 1}`}
                  />
                ))}
                {/* Absent dots */}
                {Array.from({ length: week.absent }).map((_, i) => (
                  <div 
                    key={`absent-${i}`}
                    className="w-3 h-3 rounded-full bg-red-500"
                    title={`Absent - Day ${week.present + week.late + i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderYearView = (child: ChildAttendance) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">This Year</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'year')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {child.yearlyAttendance.map((month, index) => {
          const totalDays = month.present + month.absent + month.late
          const attendancePercentage = Math.round(((month.present + month.late) / totalDays) * 100)
          
          return (
            <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              {/* Month header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-semibold text-gray-900">{month.month}</div>
                <div className="text-sm font-medium text-gray-700">{attendancePercentage}%</div>
              </div>
              
              {/* Attendance dots grid */}
              <div className="mb-3">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {/* Present dots */}
                  {Array.from({ length: month.present }).map((_, i) => (
                    <div 
                      key={`present-${i}`}
                      className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                      title={`Present - Day ${i + 1}`}
                    />
                  ))}
                  {/* Late dots */}
                  {Array.from({ length: month.late }).map((_, i) => (
                    <div 
                      key={`late-${i}`}
                      className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                      title={`Late - Day ${month.present + i + 1}`}
                    />
                  ))}
                  {/* Absent dots */}
                  {Array.from({ length: month.absent }).map((_, i) => (
                    <div 
                      key={`absent-${i}`}
                      className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                      title={`Absent - Day ${month.present + month.late + i + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Summary stats */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Total: {totalDays} days</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-green-700">{month.present}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-yellow-700">{month.late}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-red-700">{month.absent}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your children's attendance history.
          </p>
        </div>
      </div>

      {/* View Toggle and Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* View Type Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['week', 'month', 'year'] as ViewType[]).map((view) => (
                  <Button
                    key={view}
                    variant={viewType === view ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType(view)}
                    className="capitalize"
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>

            {/* Navigation */}
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
                  {formatDateRange(currentDate, viewType)}
                </div>
                <div className="text-sm text-gray-500 capitalize">{viewType} View</div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canNavigateNext(currentDate, viewType)}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrent}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Current
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Children Attendance Cards */}
      <div className="space-y-6">
        {attendanceData.map((child) => {
          const periodAttendance = calculatePeriodAttendance(child, viewType)
          const rating = getAttendanceRating(periodAttendance)
          const TrendIcon = rating.icon
          
          return (
            <Card key={child.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {child.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {child.class} • {child.teacher}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {periodAttendance}%
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{viewType} View</div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <TrendIcon className={`h-4 w-4 ${rating.color}`} />
                      <span className={`text-sm font-medium ${rating.color}`}>
                        {rating.text}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {viewType === 'week' && renderWeekView(child)}
                {viewType === 'month' && renderMonthView(child)}
                {viewType === 'year' && renderYearView(child)}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {attendanceData.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-500">
              No children are registered under your account. Please contact your madrasah administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
