'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft,
  User,
  Calendar,
  Users
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Student {
  id: string
  name: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  time?: string
  attendancePercentage?: number
  weeklyAttendance?: {
    day: string
    date?: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
    time?: string
  }[]
}

interface ClassDetails {
  id: string
  name: string
  teacher: string
  date: Date | string
  totalStudents: number
  present: number
  absent: number
  late: number
  students: Student[]
}

interface DetailedClassAttendanceProps {
  classDetails: ClassDetails
  onBack: () => void
  onStudentClick: (studentId: string) => void
  filterType?: 'week' | 'month' | 'year'
  dateRange?: { start: Date; end: Date } | null
}

export function DetailedClassAttendance({ 
  classDetails, 
  onBack, 
  onStudentClick,
  filterType = 'week',
  dateRange
}: DetailedClassAttendanceProps) {
  
  const getWeekDays = () => {
    if (!dateRange || filterType !== 'week') return []
    
    const days: { day: string; date: Date; shortDay: string }[] = []
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        days.push({
          day: dayNames[dayOfWeek],
          date: new Date(current),
          shortDay: shortDayNames[dayOfWeek]
        })
      }
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getMonthDays = () => {
    if (!dateRange || filterType !== 'month') return []
    
    const days: { day: string; date: Date; shortDay: string }[] = []
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    
    const current = new Date(start)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // Only include weekdays (Monday-Friday)
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
    
    return days
  }
  
  const getYearMonths = () => {
    if (!dateRange || filterType !== 'year') return []
    
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
    
    return months
  }
  
  const weekDays = getWeekDays()
  const monthDays = getMonthDays()
  const yearMonths = getYearMonths()
  const showWeekBreakdown = filterType === 'week' && weekDays.length > 0
  const showMonthBreakdown = filterType === 'month' && monthDays.length > 0
  const showYearBreakdown = filterType === 'year' && yearMonths.length > 0
  
  const attendanceRate = classDetails.totalStudents > 0
    ? Math.round(((classDetails.present + classDetails.late) / classDetails.totalStudents) * 100)
    : 0

  const formatPeriodLabel = () => {
    if (!dateRange) return formatDate(classDetails.date)
    if (filterType === 'week') {
      return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    }
    if (filterType === 'month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[dateRange.start.getMonth()]} ${dateRange.start.getFullYear()}`
    }
    if (filterType === 'year') {
      return dateRange.start.getFullYear().toString()
    }
    return formatDate(classDetails.date)
  }

  const getWeeklyStatusDot = (status: string, day: string, time?: string) => {
    const baseClasses = "w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer border-2"
    const tooltipText = status === 'LATE' && time 
      ? `${day}: ${status} (arrived at ${time})`
      : `${day}: ${status}`
    
    switch (status) {
      case 'PRESENT':
        return (
          <div 
            className={`${baseClasses} bg-green-500 border-green-600 hover:bg-green-600`}
            title={tooltipText}
          >
            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white m-0.5" />
          </div>
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 border-red-600 hover:bg-red-600`}
            title={tooltipText}
          >
            <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white m-0.5" />
          </div>
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 border-yellow-600 hover:bg-yellow-600`}
            title={tooltipText}
          >
            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white m-0.5" />
          </div>
        )
      case 'NOT_SCHEDULED':
        return (
          <div 
            className={`${baseClasses} bg-[var(--muted)] border-[var(--border)] hover:bg-[var(--accent)]`}
            title={`${day}: Not scheduled`}
          />
        )
      default:
        return (
          <div 
            className={`${baseClasses} bg-[var(--muted)] border-[var(--border)] hover:bg-[var(--accent)]`}
            title={`${day}: Unknown status`}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="!pt-4 sm:!pt-5 !pb-4 sm:!pb-5">
          {/* Mobile Layout */}
          <div className="flex flex-col sm:hidden gap-3">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onBack}
                className="flex items-center gap-1.5 h-8"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs">Back</span>
              </Button>
              <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
                <Users className="h-3 w-3" />
                {classDetails.totalStudents} students
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-[var(--foreground)] truncate mb-1">{classDetails.name}</CardTitle>
                <div className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatPeriodLabel()}</span>
                  </div>
                  <div className="truncate">{classDetails.teacher}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2 h-9 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back</span>
              </Button>
              <div className="flex flex-row items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <CardTitle className="text-lg lg:text-xl font-semibold text-[var(--foreground)] truncate">{classDetails.name}</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs lg:text-sm text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatPeriodLabel()}
                  </span>
                  <span>•</span>
                  <span className="truncate">{classDetails.teacher}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
                <Users className="h-3.5 w-3.5" />
                {classDetails.totalStudents} students
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      {(() => {
        const totalRecords = classDetails.present + classDetails.absent + classDetails.late
        const presentPercentage = totalRecords > 0 ? Math.round((classDetails.present / totalRecords) * 100) : 0
        const absentPercentage = totalRecords > 0 ? Math.round((classDetails.absent / totalRecords) * 100) : 0
        const latePercentage = totalRecords > 0 ? Math.round((classDetails.late / totalRecords) * 100) : 0

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              {/* Mobile: Dashboard style */}
              <div className="sm:hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm text-[var(--muted-foreground)]">Present</div>
                  <div className="p-2 rounded-full bg-green-100 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{presentPercentage}%</div>
                </CardContent>
              </div>
              
              {/* Desktop: Original style */}
              <CardContent className="hidden sm:block p-4 !pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <div className="text-right pr-2">
                    <div className="text-2xl font-bold text-[var(--foreground)]">{presentPercentage}%</div>
                    <div className="text-xs text-[var(--muted-foreground)]">of records</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Present</div>
                <div className="w-full bg-[var(--muted)] rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${presentPercentage}%` 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              {/* Mobile: Dashboard style */}
              <div className="sm:hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm text-[var(--muted-foreground)]">Absent</div>
                  <div className="p-2 rounded-full bg-red-100 flex-shrink-0">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{absentPercentage}%</div>
                </CardContent>
              </div>
              
              {/* Desktop: Original style */}
              <CardContent className="hidden sm:block p-4 !pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <div className="text-right pr-2">
                    <div className="text-2xl font-bold text-[var(--foreground)]">{absentPercentage}%</div>
                    <div className="text-xs text-[var(--muted-foreground)]">of records</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Absent</div>
                <div className="w-full bg-[var(--muted)] rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${absentPercentage}%` 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              {/* Mobile: Dashboard style */}
              <div className="sm:hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="text-sm text-[var(--muted-foreground)]">Late</div>
                  <div className="p-2 rounded-full bg-yellow-100 flex-shrink-0">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{latePercentage}%</div>
                </CardContent>
              </div>
              
              {/* Desktop: Original style */}
              <CardContent className="hidden sm:block p-4 !pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <div className="text-right pr-2">
                    <div className="text-2xl font-bold text-[var(--foreground)]">{latePercentage}%</div>
                    <div className="text-xs text-[var(--muted-foreground)]">of records</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Late</div>
                <div className="w-full bg-[var(--muted)] rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${latePercentage}%` 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-[var(--foreground)]">Student Attendance</CardTitle>
            <Badge variant="outline" className="text-xs">
              {classDetails.students.length} {classDetails.students.length === 1 ? 'student' : 'students'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {classDetails.students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Students</h3>
              <p className="text-sm text-[var(--muted-foreground)]">No students enrolled in this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold sticky left-0 bg-[var(--card)] z-10 min-w-[120px] sm:min-w-[150px]">Student Name</TableHead>
                      <TableHead className="font-semibold text-center min-w-[60px] sm:min-w-[80px]">Average</TableHead>
                    {showWeekBreakdown ? (
                      <>
                        {weekDays.map((day) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
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
                      </>
                    ) : showMonthBreakdown ? (
                      <>
                        {monthDays.map((day) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                          
                          return (
                            <TableHead 
                              key={day.date.toISOString()} 
                              className={`text-center min-w-[40px] sm:min-w-[60px] ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
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
                      </>
                    ) : showYearBreakdown ? (
                      <>
                        {yearMonths.map((month) => {
                          const today = new Date()
                          const isCurrentMonth = month.monthIndex === today.getMonth() && month.year === today.getFullYear()
                          
                          return (
                            <TableHead 
                              key={`${month.year}-${month.monthIndex}`} 
                              className={`text-center min-w-[50px] sm:min-w-[80px] ${isCurrentMonth ? 'bg-[var(--primary)]/5' : ''}`}
                            >
                              <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{month.month}</span>
                                <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">{month.year}</span>
                              </div>
                            </TableHead>
                          )
                        })}
                      </>
                    ) : (
                      <>
                        <TableHead className="hidden md:table-cell font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...classDetails.students]
                    .sort((a, b) => {
                      const aParts = a.name.split(' ')
                      const bParts = b.name.split(' ')
                      const aFirstName = aParts[0] || ''
                      const bFirstName = bParts[0] || ''
                      const aLastName = aParts.length > 1 ? aParts[aParts.length - 1] : ''
                      const bLastName = bParts.length > 1 ? bParts[bParts.length - 1] : ''
                      
                      const firstNameCompare = aFirstName.localeCompare(bFirstName, undefined, { sensitivity: 'base' })
                      if (firstNameCompare !== 0) return firstNameCompare
                      return aLastName.localeCompare(bLastName, undefined, { sensitivity: 'base' })
                    })
                    .map((student) => {
                      // Build attendance map for quick lookup
                      const attendanceMap = new Map<string, { status: string; time?: string }>()
                      
                      // Add weekly attendance if available
                      if (student.weeklyAttendance) {
                        student.weeklyAttendance.forEach((wa: any) => {
                          const dateKey = typeof wa.date === 'string' 
                            ? wa.date 
                            : new Date(wa.date).toISOString().split('T')[0]
                          attendanceMap.set(dateKey, {
                            status: wa.status,
                            time: wa.time
                          })
                        })
                      }
                      
                      const getDayStatus = (dayDate: Date) => {
                        const dateKey = dayDate.toISOString().split('T')[0]
                        const attendance = attendanceMap.get(dateKey)
                        return attendance?.status || 'NOT_SCHEDULED'
                      }
                      
                      const getDayAttendance = (dayDate: Date) => {
                        const dateKey = dayDate.toISOString().split('T')[0]
                        return attendanceMap.get(dateKey)
                      }
                      
                      const getMonthAttendance = (monthIndex: number, year: number) => {
                        const monthAttendance: { present: number; absent: number; late: number; total: number } = {
                          present: 0,
                          absent: 0,
                          late: 0,
                          total: 0
                        }
                        
                        attendanceMap.forEach((attendance, dateKey) => {
                          // dateKey is in format "YYYY-MM-DD", parse it correctly
                          const [yearStr, monthStr, dayStr] = dateKey.split('-')
                          const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr))
                          
                          if (date.getMonth() === monthIndex && date.getFullYear() === year) {
                            monthAttendance.total++
                            if (attendance.status === 'PRESENT') {
                              monthAttendance.present++
                            } else if (attendance.status === 'ABSENT') {
                              monthAttendance.absent++
                            } else if (attendance.status === 'LATE') {
                              monthAttendance.late++
                            }
                          }
                        })
                        
                        return monthAttendance
                      }
                      
                      // Calculate average attendance for the period
                      const calculateAverageAttendance = () => {
                        if (!dateRange) return 0
                        
                        const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
                        const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        
                        let totalScheduled = 0
                        let presentOrLate = 0
                        
                        const current = new Date(start)
                        while (current <= end) {
                          const dayOfWeek = current.getDay()
                          // Only count weekdays (Monday-Friday)
                          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                            const currentDate = new Date(current)
                            currentDate.setHours(0, 0, 0, 0)
                            
                            // Only count days up to today (don't count future dates)
                            if (currentDate <= today) {
                              totalScheduled++
                              const dateKey = currentDate.toISOString().split('T')[0]
                              const attendance = attendanceMap.get(dateKey)
                              if (attendance && (attendance.status === 'PRESENT' || attendance.status === 'LATE')) {
                                presentOrLate++
                              }
                            }
                          }
                          current.setDate(current.getDate() + 1)
                        }
                        
                        return totalScheduled > 0 ? Math.round((presentOrLate / totalScheduled) * 100) : 0
                      }
                      
                      const averageAttendance = calculateAverageAttendance()
                      
                      // Color coordination for average
                      const getAverageColor = (percentage: number) => {
                        if (percentage >= 95) return 'text-green-600 font-bold'
                        if (percentage >= 90) return 'text-green-500 font-semibold'
                        if (percentage >= 85) return 'text-yellow-600 font-semibold'
                        if (percentage >= 80) return 'text-yellow-500'
                        if (percentage >= 75) return 'text-orange-500'
                        return 'text-red-500'
                      }
                      
                      return (
                        <TableRow 
                          key={student.id} 
                          className="hover:bg-[var(--muted)]/30 cursor-pointer transition-colors"
                          onClick={() => {
                            console.log('TableRow clicked for student:', student.id)
                            onStudentClick(student.id)
                          }}
                        >
                          <TableCell 
                            className="sticky left-0 bg-[var(--card)] z-10"
                            onClick={() => {
                              console.log('TableCell clicked for student:', student.id)
                              onStudentClick(student.id)
                            }}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--foreground)]" />
                              </div>
                              <span className="font-medium text-[var(--foreground)] text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell 
                            className="text-center"
                            onClick={() => {
                              console.log('TableCell (Average) clicked for student:', student.id)
                              onStudentClick(student.id)
                            }}
                          >
                            <div className={`text-xs sm:text-sm ${getAverageColor(averageAttendance)}`}>
                              {averageAttendance}%
                            </div>
                          </TableCell>
                          {showWeekBreakdown ? (
                            weekDays.map((day) => {
                              const dayStatus = getDayStatus(day.date)
                              const dayAttendance = getDayAttendance(day.date)
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                              
                              return (
                                <TableCell 
                                  key={day.date.toISOString()} 
                                  className={`text-center ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                                  onClick={() => {
                                    console.log('TableCell (Week) clicked for student:', student.id)
                                    onStudentClick(student.id)
                                  }}
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    {getWeeklyStatusDot(dayStatus, day.shortDay, dayAttendance?.time)}
                                    {dayAttendance?.time && (
                                      <span className="text-xs text-[var(--muted-foreground)] font-medium">
                                        {dayAttendance.time}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              )
                            })
                          ) : showMonthBreakdown ? (
                            monthDays.map((day) => {
                              const dayStatus = getDayStatus(day.date)
                              const dayAttendance = getDayAttendance(day.date)
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                              
                              return (
                                <TableCell 
                                  key={day.date.toISOString()} 
                                  className={`text-center ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                                  onClick={() => {
                                    console.log('TableCell (Month) clicked for student:', student.id)
                                    onStudentClick(student.id)
                                  }}
                                >
                                  <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                                    {getWeeklyStatusDot(dayStatus, day.shortDay, dayAttendance?.time)}
                                    {dayAttendance?.time && (
                                      <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">
                                        {dayAttendance.time}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              )
                            })
                          ) : showYearBreakdown ? (
                            yearMonths.map((month) => {
                              const monthAttendance = getMonthAttendance(month.monthIndex, month.year)
                              const attendancePercentage = monthAttendance.total > 0
                                ? Math.round(((monthAttendance.present + monthAttendance.late) / monthAttendance.total) * 100)
                                : 0
                              const today = new Date()
                              const isCurrentMonth = month.monthIndex === today.getMonth() && month.year === today.getFullYear()
                              
                              // Color coordination based on attendance percentage
                              const getPercentageColor = (percentage: number) => {
                                if (percentage >= 95) return 'text-green-600'
                                if (percentage >= 90) return 'text-green-500'
                                if (percentage >= 85) return 'text-yellow-600'
                                if (percentage >= 80) return 'text-yellow-500'
                                if (percentage >= 75) return 'text-orange-500'
                                return 'text-red-500'
                              }
                              
                              const percentageColor = getPercentageColor(attendancePercentage)
                              
                              return (
                                <TableCell 
                                  key={`${month.year}-${month.monthIndex}`} 
                                  className={`text-center ${isCurrentMonth ? 'bg-[var(--primary)]/5' : ''}`}
                                  onClick={() => {
                                    console.log('TableCell (Year) clicked for student:', student.id)
                                    onStudentClick(student.id)
                                  }}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    {monthAttendance.total > 0 ? (
                                      <>
                                        <div className={`text-sm font-bold ${percentageColor}`}>
                                          {attendancePercentage}%
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-xs text-[var(--muted-foreground)]">-</span>
                                    )}
                                  </div>
                                </TableCell>
                              )
                            })
                          ) : (
                            <>
                              <TableCell 
                                className="hidden md:table-cell text-[var(--muted-foreground)]"
                                onClick={() => {
                                  console.log('TableCell (Time) clicked for student:', student.id)
                                  onStudentClick(student.id)
                                }}
                              >
                                {student.time || '-'}
                              </TableCell>
                              <TableCell
                                onClick={() => {
                                  console.log('TableCell (Status) clicked for student:', student.id)
                                  onStudentClick(student.id)
                                }}
                              >
                                <Badge 
                                  className={`flex items-center gap-1.5 w-fit ${
                                    student.status === 'PRESENT'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : student.status === 'ABSENT'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : student.status === 'LATE'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {student.status === 'PRESENT' && <CheckCircle2 className="h-3 w-3" />}
                                  {student.status === 'ABSENT' && <XCircle className="h-3 w-3" />}
                                  {student.status === 'LATE' && <Clock className="h-3 w-3" />}
                                  {student.status || 'Unmarked'}
                                </Badge>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )
                    })}
                </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
