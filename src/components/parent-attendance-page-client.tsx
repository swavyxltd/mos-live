'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Users,
  User
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

  const isCurrentWeek = (date: Date) => {
    const today = new Date()
    const currentWeekStart = getWeekStart(today)
    const selectedWeekStart = getWeekStart(date)
    return currentWeekStart.getTime() === selectedWeekStart.getTime()
  }

  const formatDateRange = (date: Date, view: ViewType) => {
    switch (view) {
      case 'week':
        if (isCurrentWeek(date)) {
          return 'This Week So Far'
        }
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

  const getStatusDot = (status: string, day: string, time?: string) => {
    const baseClasses = "w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer shadow-sm"
    const tooltipText = status === 'LATE' && time 
      ? `${day}: ${status} (arrived at ${time})`
      : `${day}: ${status}`
    
    switch (status) {
      case 'PRESENT':
        return (
          <div 
            className={`${baseClasses} bg-green-500 hover:bg-green-600 shadow-green-500/30`}
            title={tooltipText}
          />
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 hover:bg-red-600 shadow-red-500/30`}
            title={tooltipText}
          />
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30`}
            title={tooltipText}
          />
        )
      case 'NOT_SCHEDULED':
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={tooltipText}
          />
        )
      default:
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={tooltipText}
          />
        )
    }
  }

  const calculatePeriodAttendance = (child: ChildAttendance, view: ViewType) => {
    switch (view) {
      case 'week':
        // Only count days that have occurred so far (today or earlier) AND have actual attendance records
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayDateString = today.toISOString().split('T')[0]
        
        const daysSoFar = child.weeklyAttendance.filter(day => {
          const hasOccurred = day.date <= todayDateString
          const hasAttendanceRecord = day.status !== 'NOT_SCHEDULED'
          return hasOccurred && hasAttendanceRecord
        })
        
        if (daysSoFar.length === 0) return 0
        
        const weekPresent = daysSoFar.filter(day => 
          day.status === 'PRESENT' || day.status === 'LATE'
        ).length
        return Math.round((weekPresent / daysSoFar.length) * 100)

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
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">Weekly Breakdown</h3>
        <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'week')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {child.weeklyAttendance.map((day, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center gap-2 p-3 bg-[var(--accent)]/30 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--accent)]/50 hover:border-[var(--primary)]/30 transition-all group"
          >
            <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
              {day.day}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              {getStatusDot(day.status, day.day, day.time)}
              <div className="text-xs text-[var(--muted-foreground)] text-center font-medium">
                {day.status === 'PRESENT' || day.status === 'LATE' 
                  ? day.time 
                  : day.status === 'ABSENT' 
                  ? 'Absent' 
                  : day.status === 'NOT_SCHEDULED'
                  ? 'N/A'
                  : day.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderMonthView = (child: ChildAttendance) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">Monthly Breakdown</h3>
        <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'month')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {child.monthlyAttendance.map((week, index) => {
          const totalDays = week.present + week.absent + week.late
          const weekPercentage = totalDays > 0 
            ? Math.round(((week.present + week.late) / totalDays) * 100) 
            : 0
          
          return (
            <div key={index} className="p-3 bg-[var(--accent)]/30 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[var(--foreground)]">{week.week}</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {totalDays} days
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    {weekPercentage}%
                  </div>
                </div>
              </div>
              
              {/* Week dots and stats combined */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex gap-1 flex-wrap">
                    {/* Present dots */}
                    {Array.from({ length: week.present }).map((_, i) => (
                      <div 
                        key={`present-${i}`}
                        className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                        title={`Present - Day ${i + 1}`}
                      />
                    ))}
                    {/* Late dots */}
                    {Array.from({ length: week.late }).map((_, i) => (
                      <div 
                        key={`late-${i}`}
                        className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm"
                        title={`Late - Day ${week.present + i + 1}`}
                      />
                    ))}
                    {/* Absent dots */}
                    {Array.from({ length: week.absent }).map((_, i) => (
                      <div 
                        key={`absent-${i}`}
                        className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
                        title={`Absent - Day ${week.present + week.late + i + 1}`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Summary stats - compact */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{week.present}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{week.late}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{week.absent}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderYearView = (child: ChildAttendance) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">Yearly Breakdown</h3>
        <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3" />
          {formatDateRange(currentDate, 'year')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {child.yearlyAttendance.map((month, index) => {
          const totalDays = month.present + month.absent + month.late
          const attendancePercentage = totalDays > 0
            ? Math.round(((month.present + month.late) / totalDays) * 100)
            : 0
          
          return (
            <div key={index} className="p-3 bg-[var(--accent)]/30 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--accent)]/50 hover:border-[var(--primary)]/30 transition-all">
              {/* Month header */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[var(--foreground)]">{month.month}</div>
                <div className="text-sm font-bold text-[var(--foreground)]">{attendancePercentage}%</div>
              </div>
              
              {/* Attendance dots grid */}
              <div className="mb-2">
                <div className="flex gap-0.5 flex-wrap">
                  {/* Present dots */}
                  {Array.from({ length: month.present }).map((_, i) => (
                    <div 
                      key={`present-${i}`}
                      className="w-2.5 h-2.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                      title={`Present - Day ${i + 1}`}
                    />
                  ))}
                  {/* Late dots */}
                  {Array.from({ length: month.late }).map((_, i) => (
                    <div 
                      key={`late-${i}`}
                      className="w-2.5 h-2.5 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm"
                      title={`Late - Day ${month.present + i + 1}`}
                    />
                  ))}
                  {/* Absent dots */}
                  {Array.from({ length: month.absent }).map((_, i) => (
                    <div 
                      key={`absent-${i}`}
                      className="w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
                      title={`Absent - Day ${month.present + month.late + i + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Summary stats */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--muted-foreground)]">{totalDays} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{month.present}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{month.late}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <span className="text-xs text-[var(--muted-foreground)]">{month.absent}</span>
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
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Attendance</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track your children's attendance history.
          </p>
        </div>
      </div>

      {/* View Toggle and Navigation */}
      <Card className="hover:shadow-lg transition-shadow border-[var(--border)]">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* View Type Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">View:</span>
              <div className="flex bg-[var(--accent)] rounded-lg p-1">
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
                <div className="text-sm font-medium text-[var(--foreground)]">
                  {formatDateRange(currentDate, viewType)}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] capitalize">{viewType} View</div>
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
            <Card key={child.id} className="hover:shadow-lg transition-all border-[var(--border)]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-[var(--foreground)]">
                        {child.name}
                      </CardTitle>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {child.class} • {child.teacher}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[var(--foreground)]">
                        {periodAttendance}%
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5 capitalize">{viewType} View</div>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)]">
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
        <Card className="border-[var(--border)]">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No Children Found</h3>
            <p className="text-[var(--muted-foreground)]">
              No children are registered under your account. Please contact your madrasah administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
