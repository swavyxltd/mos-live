'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { AttendanceWeekFilter } from '@/components/attendance-week-filter'

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
  allAttendanceRecords?: Array<{
    date: string
    status: string
    time?: string
  }>
  monthlyAttendance: WeeklyAttendance[]
  yearlyAttendance: MonthlyAttendance[]
}

interface ParentAttendancePageClientProps {
  attendanceData: ChildAttendance[]
}

type ViewType = 'week' | 'month' | 'year'

export function ParentAttendancePageClient({ attendanceData }: ParentAttendancePageClientProps) {
  const router = useRouter()
  const [viewType, setViewType] = useState<ViewType>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  
  // Listen for attendance saved event to refresh page
  useEffect(() => {
    const handleAttendanceSaved = () => {
      // Use router.refresh() for smoother UX without full page reload
      router.refresh()
    }
    
    window.addEventListener('attendance-saved', handleAttendanceSaved)
    
    return () => {
      window.removeEventListener('attendance-saved', handleAttendanceSaved)
    }
  }, [router])


  const calculatePeriodAttendance = (child: ChildAttendance, view: ViewType) => {
    if (!dateRange || !child.allAttendanceRecords) {
      return child.overallAttendance || 0
    }
    
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Filter records within date range and up to today
    const filteredRecords = child.allAttendanceRecords.filter(record => {
      const recordDate = new Date(record.date)
      recordDate.setHours(0, 0, 0, 0)
      return recordDate >= start && recordDate <= end && recordDate <= today
    })
    
    if (filteredRecords.length === 0) return 0
    
    const presentOrLate = filteredRecords.filter(r => 
      r.status === 'PRESENT' || r.status === 'LATE'
    ).length
    
    return Math.round((presentOrLate / filteredRecords.length) * 100)
  }

  const renderWeekView = (child: ChildAttendance) => {
    if (!dateRange) return null
    
    // Get week days
    const days: { day: string; date: Date; shortDay: string }[] = []
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    const current = new Date(start)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const currentDate = new Date(current)
        currentDate.setHours(0, 0, 0, 0)
        days.push({
          day: dayNames[dayOfWeek],
          date: currentDate,
          shortDay: shortDayNames[dayOfWeek]
        })
      }
      current.setDate(current.getDate() + 1)
    }
    
    // Build attendance map
    const attendanceMap = new Map<string, { status: string; time?: string }>()
    if (child.allAttendanceRecords) {
      child.allAttendanceRecords.forEach(record => {
        const dateKey = record.date
        attendanceMap.set(dateKey, {
          status: record.status,
          time: record.time
        })
      })
    }
    
    // Calculate stats
    const filteredRecords = days.filter(day => {
      const dateKey = day.date.toISOString().split('T')[0]
      return dateKey <= today.toISOString().split('T')[0]
    }).map(day => {
      const dateKey = day.date.toISOString().split('T')[0]
      return attendanceMap.get(dateKey)
    }).filter(Boolean)
    
    const presentCount = filteredRecords.filter(r => r?.status === 'PRESENT').length
    const absentCount = filteredRecords.filter(r => r?.status === 'ABSENT').length
    const lateCount = filteredRecords.filter(r => r?.status === 'LATE').length
    const totalCount = filteredRecords.length
    
    // Calculate average
    const presentOrLate = presentCount + lateCount
    const averageAttendance = totalCount > 0 ? Math.round((presentOrLate / totalCount) * 100) : 0
    
    const getAverageColor = (percentage: number) => {
      if (percentage >= 95) return 'text-green-600 font-bold'
      if (percentage >= 90) return 'text-green-500 font-semibold'
      if (percentage >= 85) return 'text-yellow-600 font-semibold'
      if (percentage >= 80) return 'text-yellow-500'
      if (percentage >= 75) return 'text-orange-500'
      return 'text-red-500'
    }
    
    const getWeeklyStatusDot = (status: string, shortDay: string, time?: string | null) => {
      if (status === 'PRESENT') {
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
      } else if (status === 'ABSENT') {
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
      } else if (status === 'LATE') {
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
      }
      return <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-[var(--muted-foreground)]/30" />
    }
    
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Present</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{presentCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((presentCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Absent</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{absentCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((absentCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Late</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{lateCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((lateCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold sticky left-0 bg-[var(--card)] z-10 min-w-[120px] sm:min-w-[150px]">Student Name</TableHead>
                  <TableHead className="font-semibold text-center min-w-[60px] sm:min-w-[80px]">Average</TableHead>
                  {days.map((day) => {
                    const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                    return (
                      <TableHead 
                        key={day.date.toISOString()}
                        className={`text-center min-w-[50px] sm:min-w-[80px] ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{day.shortDay}</span>
                          <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">
                            {day.date.getDate()}/{day.date.getMonth() + 1}
                          </span>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-[var(--muted)]/30 transition-colors">
                  <TableCell className="sticky left-0 bg-[var(--card)] z-10">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--foreground)]" />
                      </div>
                      <span className="font-medium text-[var(--foreground)] text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                        {child.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`text-xs sm:text-sm ${getAverageColor(averageAttendance)}`}>
                      {averageAttendance}%
                    </div>
                  </TableCell>
                  {days.map((day) => {
                    const dateKey = day.date.toISOString().split('T')[0]
                    const attendance = attendanceMap.get(dateKey)
                    const dayStatus = attendance?.status || 'NOT_SCHEDULED'
                    const isToday = dateKey === today.toISOString().split('T')[0]
                    
                    return (
                      <TableCell 
                        key={day.date.toISOString()}
                        className={`text-center ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          {getWeeklyStatusDot(dayStatus, day.shortDay, attendance?.time)}
                          {attendance?.time && (
                            <span className="text-xs text-[var(--muted-foreground)] font-medium">
                              {attendance.time}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  const renderMonthView = (child: ChildAttendance) => {
    if (!dateRange) return null
    
    // Get all days in the month
    const days: { day: string; date: Date; shortDay: string }[] = []
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    const current = new Date(start)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const currentDate = new Date(current)
        currentDate.setHours(0, 0, 0, 0)
        days.push({
          day: dayNames[dayOfWeek],
          date: currentDate,
          shortDay: shortDayNames[dayOfWeek]
        })
      }
      current.setDate(current.getDate() + 1)
    }
    
    // Build attendance map
    const attendanceMap = new Map<string, { status: string; time?: string }>()
    if (child.allAttendanceRecords) {
      child.allAttendanceRecords.forEach(record => {
        const dateKey = record.date
        attendanceMap.set(dateKey, {
          status: record.status,
          time: record.time
        })
      })
    }
    
    // Calculate stats
    const filteredRecords = days.filter(day => {
      const dateKey = day.date.toISOString().split('T')[0]
      return dateKey <= today.toISOString().split('T')[0]
    }).map(day => {
      const dateKey = day.date.toISOString().split('T')[0]
      return attendanceMap.get(dateKey)
    }).filter(Boolean)
    
    const presentCount = filteredRecords.filter(r => r?.status === 'PRESENT').length
    const absentCount = filteredRecords.filter(r => r?.status === 'ABSENT').length
    const lateCount = filteredRecords.filter(r => r?.status === 'LATE').length
    const totalCount = filteredRecords.length
    
    // Calculate average
    const presentOrLate = presentCount + lateCount
    const averageAttendance = totalCount > 0 ? Math.round((presentOrLate / totalCount) * 100) : 0
    
    const getAverageColor = (percentage: number) => {
      if (percentage >= 95) return 'text-green-600 font-bold'
      if (percentage >= 90) return 'text-green-500 font-semibold'
      if (percentage >= 85) return 'text-yellow-600 font-semibold'
      if (percentage >= 80) return 'text-yellow-500'
      if (percentage >= 75) return 'text-orange-500'
      return 'text-red-500'
    }
    
    const getWeeklyStatusDot = (status: string, shortDay: string, time?: string | null) => {
      if (status === 'PRESENT') {
        return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
      } else if (status === 'ABSENT') {
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
      } else if (status === 'LATE') {
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
      }
      return <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-[var(--muted-foreground)]/30" />
    }
    
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Present</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{presentCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((presentCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Absent</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{absentCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((absentCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Late</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{lateCount}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((lateCount / totalCount) * 100)}% of records
              </div>
            )}
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold sticky left-0 bg-[var(--card)] z-10 min-w-[120px] sm:min-w-[150px]">Student Name</TableHead>
                  <TableHead className="font-semibold text-center min-w-[60px] sm:min-w-[80px]">Average</TableHead>
                  {days.map((day) => {
                    const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                    return (
                      <TableHead 
                        key={day.date.toISOString()}
                        className={`text-center min-w-[50px] sm:min-w-[80px] ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{day.shortDay}</span>
                          <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">
                            {day.date.getDate()}/{day.date.getMonth() + 1}
                          </span>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-[var(--muted)]/30 transition-colors">
                  <TableCell className="sticky left-0 bg-[var(--card)] z-10">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--foreground)]" />
                      </div>
                      <span className="font-medium text-[var(--foreground)] text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                        {child.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`text-xs sm:text-sm ${getAverageColor(averageAttendance)}`}>
                      {averageAttendance}%
                    </div>
                  </TableCell>
                  {days.map((day) => {
                    const dateKey = day.date.toISOString().split('T')[0]
                    const attendance = attendanceMap.get(dateKey)
                    const dayStatus = attendance?.status || 'NOT_SCHEDULED'
                    const isToday = dateKey === today.toISOString().split('T')[0]
                    
                    return (
                      <TableCell 
                        key={day.date.toISOString()}
                        className={`text-center ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          {getWeeklyStatusDot(dayStatus, day.shortDay, attendance?.time)}
                          {attendance?.time && (
                            <span className="text-xs text-[var(--muted-foreground)] font-medium">
                              {attendance.time}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  const renderYearView = (child: ChildAttendance) => {
    if (!dateRange) return null
    
    // Get all months in the year
    const months: { month: string; monthIndex: number; year: number }[] = []
    const year = dateRange.start.getFullYear()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    for (let i = 0; i < 12; i++) {
      months.push({
        month: monthNames[i],
        monthIndex: i,
        year: year
      })
    }
    
    // Build attendance map by month
    const monthAttendanceMap = new Map<string, { present: number; absent: number; late: number; total: number }>()
    
    if (child.allAttendanceRecords) {
      child.allAttendanceRecords.forEach(record => {
        const recordDate = new Date(record.date)
        const monthKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}`
        
        if (!monthAttendanceMap.has(monthKey)) {
          monthAttendanceMap.set(monthKey, { present: 0, absent: 0, late: 0, total: 0 })
        }
        
        const monthData = monthAttendanceMap.get(monthKey)!
        monthData.total++
        if (record.status === 'PRESENT') monthData.present++
        else if (record.status === 'ABSENT') monthData.absent++
        else if (record.status === 'LATE') monthData.late++
      })
    }
    
    // Calculate overall stats
    const allMonthData = Array.from(monthAttendanceMap.values())
    const totalPresent = allMonthData.reduce((sum, m) => sum + m.present, 0)
    const totalAbsent = allMonthData.reduce((sum, m) => sum + m.absent, 0)
    const totalLate = allMonthData.reduce((sum, m) => sum + m.late, 0)
    const totalCount = allMonthData.reduce((sum, m) => sum + m.total, 0)
    
    // Calculate average
    const presentOrLate = totalPresent + totalLate
    const averageAttendance = totalCount > 0 ? Math.round((presentOrLate / totalCount) * 100) : 0
    
    const getPercentageColor = (percentage: number) => {
      if (percentage >= 95) return 'text-green-600 font-bold'
      if (percentage >= 90) return 'text-green-500 font-semibold'
      if (percentage >= 85) return 'text-yellow-600 font-semibold'
      if (percentage >= 80) return 'text-yellow-500'
      if (percentage >= 75) return 'text-orange-500'
      return 'text-red-500'
    }
    
    const getAverageColor = (percentage: number) => {
      if (percentage >= 95) return 'text-green-600 font-bold'
      if (percentage >= 90) return 'text-green-500 font-semibold'
      if (percentage >= 85) return 'text-yellow-600 font-semibold'
      if (percentage >= 80) return 'text-yellow-500'
      if (percentage >= 75) return 'text-orange-500'
      return 'text-red-500'
    }
    
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Present</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{totalPresent}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((totalPresent / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Absent</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{totalAbsent}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((totalAbsent / totalCount) * 100)}% of records
              </div>
            )}
          </div>
          <div className="p-3 sm:p-4 !pt-3 sm:!pt-4 bg-[var(--muted)]/50 rounded-lg col-span-2 sm:col-span-1">
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Late</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{totalLate}</div>
            {totalCount > 0 && (
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {Math.round((totalLate / totalCount) * 100)}% of records
              </div>
            )}
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold sticky left-0 bg-[var(--card)] z-10 min-w-[120px] sm:min-w-[150px]">Student Name</TableHead>
                  <TableHead className="font-semibold text-center min-w-[60px] sm:min-w-[80px]">Average</TableHead>
                  {months.map((month) => (
                    <TableHead 
                      key={`${month.year}-${month.monthIndex}`}
                      className="text-center min-w-[50px] sm:min-w-[80px]"
                    >
                      <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{month.month}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-[var(--muted)]/30 transition-colors">
                  <TableCell className="sticky left-0 bg-[var(--card)] z-10">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--foreground)]" />
                      </div>
                      <span className="font-medium text-[var(--foreground)] text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                        {child.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={`text-xs sm:text-sm ${getAverageColor(averageAttendance)}`}>
                      {averageAttendance}%
                    </div>
                  </TableCell>
                  {months.map((month) => {
                    const monthKey = `${month.year}-${month.monthIndex}`
                    const monthData = monthAttendanceMap.get(monthKey)
                    const monthTotal = monthData?.total || 0
                    const monthPresent = monthData?.present || 0
                    const monthLate = monthData?.late || 0
                    const monthPercentage = monthTotal > 0 
                      ? Math.round(((monthPresent + monthLate) / monthTotal) * 100)
                      : 0
                    
                    return (
                      <TableCell 
                        key={`${month.year}-${month.monthIndex}`}
                        className="text-center"
                      >
                        <div className={`text-xs sm:text-sm font-medium ${getPercentageColor(monthPercentage)}`}>
                          {monthTotal > 0 ? `${monthPercentage}%` : '-'}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
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

      {/* Filter */}
      <AttendanceWeekFilter
        currentWeek={currentDate}
        onWeekChange={setCurrentDate}
        onDateRangeChange={(start, end) => setDateRange({ start, end })}
        filterType={viewType}
        onFilterTypeChange={setViewType}
      />

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
