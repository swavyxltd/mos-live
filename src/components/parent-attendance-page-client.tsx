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
  User,
  CheckCircle2,
  XCircle,
  Clock
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
  month?: string
  present?: number
  absent?: number
  late?: number
  date?: string
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
  time?: string
  averagePercentage?: number
  monthIndex?: number
  year?: number
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
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    return start
  }

  const getWeekEnd = (date: Date) => {
    const end = new Date(date)
    const day = end.getDay()
    const diff = end.getDate() - day + (day === 0 ? 0 : 7) - (day === 0 ? 6 : 1)
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

  const calculatePeriodAttendance = (child: ChildAttendance, view: ViewType) => {
    switch (view) {
      case 'week':
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
        const selectedMonth = currentDate.getMonth()
        const selectedYear = currentDate.getFullYear()
        const monthDays = child.monthlyAttendance.filter(day => {
          if (!day.date) return false
          const dayDate = new Date(day.date)
          return dayDate.getMonth() === selectedMonth && dayDate.getFullYear() === selectedYear
        })
        const monthTotal = monthDays.length
        const monthPresent = monthDays.filter(day => 
          day.status === 'PRESENT' || day.status === 'LATE'
        ).length
        return monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0

      case 'year':
        const selectedYearForCalc = currentDate.getFullYear()
        const yearMonths = child.yearlyAttendance.filter(month => month.year === selectedYearForCalc)
        if (yearMonths.length === 0) return 0
        const yearAverage = yearMonths.reduce((sum, month) => 
          sum + (month.averagePercentage || 0), 0
        ) / yearMonths.length
        return Math.round(yearAverage)

      default:
        return child.overallAttendance
    }
  }

  const renderWeekView = (child: ChildAttendance) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDateString = today.toISOString().split('T')[0]
    
    const presentDays = child.weeklyAttendance.filter(d => 
      (d.status === 'PRESENT' || d.status === 'LATE') && d.date <= todayDateString
    ).length
    const absentDays = child.weeklyAttendance.filter(d => 
      d.status === 'ABSENT' && d.date <= todayDateString
    ).length
    const lateDays = child.weeklyAttendance.filter(d => 
      d.status === 'LATE' && d.date <= todayDateString
    ).length
    const totalDays = child.weeklyAttendance.filter(d => 
      d.status !== 'NOT_SCHEDULED' && d.date <= todayDateString
    ).length

    return (
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-[var(--foreground)]" />
              </div>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Present</span>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{presentDays}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">of {totalDays} days</div>
          </div>
          
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <XCircle className="h-4 w-4 text-[var(--foreground)]" />
              </div>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Absent</span>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{absentDays}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">missed days</div>
          </div>
          
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-[var(--foreground)]" />
              </div>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Late</span>
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{lateDays}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">arrivals</div>
          </div>
        </div>

        {/* Week Days */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Daily Breakdown</h3>
          <div className="grid grid-cols-5 gap-3">
            {child.weeklyAttendance.map((day, index) => {
              const isToday = day.date === todayDateString
              const isFuture = day.date > todayDateString
              
              return (
                <div 
                  key={index} 
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
                    ${isToday ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] bg-[var(--card)]'}
                    ${!isFuture && day.status !== 'NOT_SCHEDULED' ? 'hover:bg-[var(--accent)]' : 'opacity-60'}
                  `}
                >
                  <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    {day.day}
                  </div>
                  
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2
                    ${day.status === 'NOT_SCHEDULED' || isFuture 
                      ? 'bg-[var(--muted)] border-[var(--border)]' 
                      : day.status === 'PRESENT'
                      ? 'bg-green-500 border-green-600'
                      : day.status === 'ABSENT'
                      ? 'bg-red-500 border-red-600'
                      : 'bg-yellow-500 border-yellow-600'
                    }
                  `}>
                    {day.status !== 'NOT_SCHEDULED' && !isFuture && (
                      day.status === 'PRESENT' ? <CheckCircle2 className="h-5 w-5 text-white" /> :
                      day.status === 'ABSENT' ? <XCircle className="h-5 w-5 text-white" /> :
                      <Clock className="h-5 w-5 text-white" />
                    )}
                  </div>
                  
                  <div className="text-center">
                    {day.status === 'PRESENT' || day.status === 'LATE' ? (
                      <div className="text-xs font-medium text-[var(--foreground)]">{day.time}</div>
                    ) : day.status === 'ABSENT' ? (
                      <div className="text-xs font-medium text-red-600">Absent</div>
                    ) : isFuture ? (
                      <div className="text-xs text-[var(--muted-foreground)]">Upcoming</div>
                    ) : (
                      <div className="text-xs text-[var(--muted-foreground)]">No class</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderMonthView = (child: ChildAttendance) => {
    const selectedMonth = currentDate.getMonth()
    const selectedYear = currentDate.getFullYear()
    const monthDays = child.monthlyAttendance.filter(day => {
      if (!day.date) return false
      const dayDate = new Date(day.date)
      return dayDate.getMonth() === selectedMonth && dayDate.getFullYear() === selectedYear
    })
    
    const presentCount = monthDays.filter(d => d.status === 'PRESENT').length
    const lateCount = monthDays.filter(d => d.status === 'LATE').length
    const absentCount = monthDays.filter(d => d.status === 'ABSENT').length
    const totalDays = monthDays.length
    const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0
    
    return (
      <div className="space-y-4">
        {/* Month Summary */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Monthly Overview</h3>
              <div className="text-2xl font-bold text-[var(--foreground)]">{attendanceRate}%</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[var(--foreground)]">{totalDays}</div>
              <div className="text-xs text-[var(--muted-foreground)]">class days</div>
            </div>
          </div>
          
          <div className="w-full bg-[var(--card)] rounded-full h-2 mb-4">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{presentCount}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Present</div>
            </div>
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{lateCount}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Late</div>
            </div>
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{absentCount}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Absent</div>
            </div>
          </div>
        </div>
        
        {/* Daily Dots */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Daily Attendance</h4>
            <Badge variant="outline" className="text-xs">
              {totalDays} days
            </Badge>
          </div>
          
          <div className="flex gap-1.5 flex-wrap">
            {monthDays.map((day, index) => {
              const dayDate = day.date ? new Date(day.date) : null
              const dayLabel = dayDate ? dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : `Day ${index + 1}`
              
              if (day.status === 'PRESENT') {
                return (
                  <div 
                    key={index}
                    className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer border border-green-600"
                    title={`${dayLabel}: Present${day.time ? ` (${day.time})` : ''}`}
                  />
                )
              } else if (day.status === 'LATE') {
                return (
                  <div 
                    key={index}
                    className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer border border-yellow-600"
                    title={`${dayLabel}: Late${day.time ? ` (${day.time})` : ''}`}
                  />
                )
              } else if (day.status === 'ABSENT') {
                return (
                  <div 
                    key={index}
                    className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors cursor-pointer border border-red-600"
                    title={`${dayLabel}: Absent`}
                  />
                )
              }
              return null
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderYearView = (child: ChildAttendance) => {
    const selectedYear = currentDate.getFullYear()
    const yearMonths = child.yearlyAttendance.filter(month => month.year === selectedYear)
    
    const totalDays = yearMonths.reduce((sum, m) => 
      sum + ((m.present || 0) + (m.absent || 0) + (m.late || 0)), 0
    )
    const totalPresent = yearMonths.reduce((sum, m) => sum + (m.present || 0), 0)
    const totalLate = yearMonths.reduce((sum, m) => sum + (m.late || 0), 0)
    const totalAbsent = yearMonths.reduce((sum, m) => sum + (m.absent || 0), 0)
    const yearAverage = yearMonths.length > 0
      ? Math.round(yearMonths.reduce((sum, m) => sum + (m.averagePercentage || 0), 0) / yearMonths.length)
      : 0
    
    return (
      <div className="space-y-4">
        {/* Year Summary */}
        <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Year Overview</h3>
              <div className="text-2xl font-bold text-[var(--foreground)]">{yearAverage}%</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">Average attendance</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[var(--foreground)]">{totalDays}</div>
              <div className="text-xs text-[var(--muted-foreground)]">total days</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{totalPresent}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Present</div>
            </div>
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{totalLate}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Late</div>
            </div>
            <div className="text-center p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)]">{totalAbsent}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-medium">Absent</div>
            </div>
          </div>
        </div>
        
        {/* Monthly Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {yearMonths.map((month, index) => {
            const averagePercentage = month.averagePercentage || 0
            
            const getDotColor = (percentage: number) => {
              if (percentage >= 95) return 'bg-green-500 border-green-600'
              if (percentage >= 90) return 'bg-yellow-500 border-yellow-600'
              if (percentage >= 85) return 'bg-orange-500 border-orange-600'
              return 'bg-red-500 border-red-600'
            }
            
            return (
              <div 
                key={index} 
                className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] hover:bg-[var(--accent)] transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-[var(--foreground)]">{month.month}</div>
                  <div className="text-sm font-bold text-[var(--foreground)]">{averagePercentage}%</div>
                </div>
                
                <div className="flex justify-center mb-3">
                  <div 
                    className={`w-10 h-10 rounded-full ${getDotColor(averagePercentage)} border-2 flex items-center justify-center`}
                    title={`${month.month}: ${averagePercentage}% average`}
                  >
                    <span className="text-xs font-bold text-white">{averagePercentage}%</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)] mb-2">
                    <span>{((month.present || 0) + (month.absent || 0) + (month.late || 0))} days</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-xs text-[var(--muted-foreground)]">{month.present || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      <span className="text-xs text-[var(--muted-foreground)]">{month.late || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <span className="text-xs text-[var(--muted-foreground)]">{month.absent || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const overallStats = attendanceData.reduce((acc, child) => {
    const periodAttendance = calculatePeriodAttendance(child, viewType)
    acc.total += periodAttendance
    acc.count += 1
    return acc
  }, { total: 0, count: 0 })
  
  const averageAttendance = overallStats.count > 0 
    ? Math.round(overallStats.total / overallStats.count) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-[var(--foreground)]" />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Attendance</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] ml-13">
            Track your children's attendance history and progress
          </p>
        </div>
        {attendanceData.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
            <div className="text-right">
              <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
                {averageAttendance}%
              </div>
              <div className="text-xs text-[var(--muted-foreground)]">Average Attendance</div>
            </div>
          </div>
        )}
      </div>

      {/* View Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* View Type Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">View:</span>
              <div className="flex bg-[var(--muted)] rounded-lg p-1 gap-1">
                {(['week', 'month', 'year'] as ViewType[]).map((view) => (
                  <Button
                    key={view}
                    variant={viewType === view ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType(view)}
                    className="capitalize min-w-[70px]"
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              
              <div className="px-4 py-2 bg-[var(--muted)] rounded-lg min-w-[140px] text-center border border-[var(--border)]">
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {formatDateRange(currentDate, viewType)}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] capitalize">{viewType} view</div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canNavigateNext(currentDate, viewType)}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCurrent}
                className="flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Today</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children Cards */}
      <div className="space-y-6">
        {attendanceData.map((child) => {
          const periodAttendance = calculatePeriodAttendance(child, viewType)
          const rating = getAttendanceRating(periodAttendance)
          const TrendIcon = rating.icon
          
          return (
            <Card key={child.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-[var(--foreground)]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-[var(--foreground)] mb-1">
                        {child.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {child.class}
                        </span>
                        <span>•</span>
                        <span>{child.teacher}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right border border-[var(--border)] rounded-lg p-3 bg-[var(--card)]">
                      <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
                        {periodAttendance}%
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] capitalize">{viewType} attendance</div>
                    </div>
                    
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] ${
                      rating.color.includes('green') ? 'bg-green-50' : 
                      rating.color.includes('yellow') ? 'bg-yellow-50' : 
                      'bg-red-50'
                    }`}>
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
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Children Found</h3>
            <p className="text-[var(--muted-foreground)] mb-2">
              No children are registered under your account yet.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              If you've just signed up, your child's information may still be being linked. Please contact the madrasah if you need assistance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
