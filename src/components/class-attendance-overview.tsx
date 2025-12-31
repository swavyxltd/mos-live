'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight,
  Calendar,
  ArrowRight
} from 'lucide-react'

interface Student {
  id: string
  name: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  time?: string
  attendancePercentage?: number
}

interface ClassAttendance {
  id: string
  classId?: string
  name: string
  teacher: string
  date: Date | string
  totalStudents: number
  present: number
  absent: number
  late: number
  students: Student[]
}

interface ActiveClass {
  id: string
  name: string
  teacher: string
  totalStudents: number
}

interface ClassAttendanceOverviewProps {
  classes: ClassAttendance[]
  onClassClick: (classId: string) => void
  onStudentClick: (studentId: string) => void
  filterType?: 'week' | 'month' | 'year'
  dateRange?: { start: Date; end: Date } | null
  allActiveClasses?: ActiveClass[]
}

export function ClassAttendanceOverview({ 
  classes, 
  onClassClick, 
  onStudentClick,
  filterType = 'week',
  dateRange,
  allActiveClasses = []
}: ClassAttendanceOverviewProps) {
  // Aggregate data by class for all views (week/month/year)
  const aggregatedClasses = useMemo(() => {
    // Group by classId - use a more reliable deduplication strategy
    const classMap = new Map<string, {
      classId: string
      name: string
      teacher: string
      totalStudents: number
      present: number
      absent: number
      late: number
      dateRange: { start: Date; end: Date } | null
      dates: Date[] // Track all dates for this class in the period
    }>()

    classes.forEach((classItem) => {
      // Use classId property if available, otherwise extract from id (format: "classId-dateKey")
      let classId: string
      if (classItem.classId) {
        classId = classItem.classId
      } else if (classItem.id.includes('-')) {
        // Extract classId from composite key "classId-YYYY-MM-DD"
        // The format is typically "classId-YYYY-MM-DD", so we need to find where the date starts
        // Look for a date pattern (YYYY-MM-DD) and split before it
        const datePattern = /\d{4}-\d{2}-\d{2}/
        const match = classItem.id.match(datePattern)
        if (match && match.index !== undefined) {
          classId = classItem.id.substring(0, match.index - 1) // -1 to remove the hyphen before the date
        } else {
          // Fallback: split on last hyphen (assuming format is "classId-dateKey")
          const parts = classItem.id.split('-')
          // Remove the last 3 parts (year-month-day) and join the rest
          if (parts.length >= 4) {
            classId = parts.slice(0, -3).join('-')
          } else {
            classId = parts[0]
          }
        }
      } else {
        classId = classItem.id
      }
      
      // Skip if classId is invalid
      if (!classId || classId === 'no-class') {
        return
      }
      
      // Use class name + teacher as the unique key to ensure proper deduplication
      // This is more reliable than classId which might be extracted inconsistently
      const uniqueKey = `${classItem.name}-${classItem.teacher}`
      const existingEntry = classMap.get(uniqueKey)

      // Parse the date from classItem
      const itemDate = typeof classItem.date === 'string' ? new Date(classItem.date) : classItem.date

      if (existingEntry) {
        // Merge attendance counts
        existingEntry.present += classItem.present
        existingEntry.absent += classItem.absent
        existingEntry.late += classItem.late
        // Track dates
        existingEntry.dates.push(itemDate)
        // Use the passed dateRange for all items in the aggregation
        existingEntry.dateRange = dateRange || null
        // Keep the first classId we encountered for this class
        // (don't update if we already have one)
      } else {
        classMap.set(uniqueKey, {
          classId,
          name: classItem.name,
          teacher: classItem.teacher,
          totalStudents: classItem.totalStudents,
          present: classItem.present,
          absent: classItem.absent,
          late: classItem.late,
          dateRange: dateRange || null,
          dates: [itemDate]
        })
      }
    })

    // Add all active classes that don't have attendance records
    allActiveClasses.forEach(activeClass => {
      const uniqueKey = `${activeClass.name}-${activeClass.teacher}`
      if (!classMap.has(uniqueKey)) {
        classMap.set(uniqueKey, {
          classId: activeClass.id,
          name: activeClass.name,
          teacher: activeClass.teacher,
          totalStudents: activeClass.totalStudents,
          present: 0,
          absent: 0,
          late: 0,
          dateRange: dateRange || null,
          dates: []
        })
      }
    })

    return Array.from(classMap.values()).map(item => ({
      id: item.classId,
      classId: item.classId,
      name: item.name,
      teacher: item.teacher,
      date: item.dateRange?.end || (item.dates.length > 0 ? item.dates[item.dates.length - 1] : new Date()),
      totalStudents: item.totalStudents,
      present: item.present,
      absent: item.absent,
      late: item.late,
      students: [] // Not needed for summary view
    }))
  }, [classes, filterType, dateRange, allActiveClasses])

  if (!classes || classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-16 w-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Attendance Data</h3>
          <p className="text-[var(--muted-foreground)]">
            No attendance records available for the selected period.
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatPeriodLabel = () => {
    if (!dateRange) return ''
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
    return formatDate(dateRange.start)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
      {aggregatedClasses.map((classItem) => {
        // Calculate attendance rate based on total records, not total students
        const totalRecords = classItem.present + classItem.absent + classItem.late
        const attendanceRate = totalRecords > 0
          ? Math.round(((classItem.present + classItem.late) / totalRecords) * 100)
          : 0
        
        const getAttendanceColor = (rate: number) => {
          if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200'
          if (rate >= 90) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
          if (rate >= 85) return 'text-orange-600 bg-orange-50 border-orange-200'
          return 'text-red-600 bg-red-50 border-red-200'
        }

        const getAttendanceBackground = (rate: number) => {
          if (rate >= 95) return 'bg-green-50'
          if (rate >= 90) return 'bg-yellow-50'
          if (rate >= 85) return 'bg-orange-50'
          return 'bg-red-50'
        }

        return (
          <Card 
            key={classItem.id} 
            className="group hover:shadow-md transition-all cursor-pointer"
            onClick={() => onClassClick(classItem.classId || classItem.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-[var(--foreground)]" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-semibold text-[var(--foreground)] truncate">
                      {classItem.name}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[var(--muted-foreground)] ml-13">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatPeriodLabel()}
                    </span>
                    <span>•</span>
                    <span>{classItem.teacher}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 ml-2 group-hover:text-[var(--foreground)] group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Attendance Rate */}
              <div className={`rounded-lg p-3 sm:p-4 ${getAttendanceBackground(attendanceRate)}`}>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">Attendance Rate</span>
                  <Badge className={`${getAttendanceColor(attendanceRate)} text-xs sm:text-sm`}>
                    {attendanceRate}%
                  </Badge>
                </div>
                <div className="w-full bg-[var(--card)] rounded-full h-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      attendanceRate >= 95 ? 'bg-green-500' :
                      attendanceRate >= 90 ? 'bg-yellow-500' :
                      attendanceRate >= 85 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              {(() => {
                const totalRecords = classItem.present + classItem.absent + classItem.late
                const presentPercentage = totalRecords > 0 ? Math.round((classItem.present / totalRecords) * 100) : 0
                const absentPercentage = totalRecords > 0 ? Math.round((classItem.absent / totalRecords) * 100) : 0
                const latePercentage = totalRecords > 0 ? Math.round((classItem.late / totalRecords) * 100) : 0

                return (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="border border-green-200 rounded-lg p-2 sm:p-3 bg-green-50">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-green-700">Present</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-green-900">{presentPercentage}%</div>
                      <div className="text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1">
                        {classItem.present} records
                      </div>
                    </div>
                    
                    <div className="border border-red-200 rounded-lg p-2 sm:p-3 bg-red-50">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-700" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-red-700">Absent</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-red-900">{absentPercentage}%</div>
                      <div className="text-[10px] sm:text-xs text-red-600 mt-0.5 sm:mt-1">
                        {classItem.absent} records
                      </div>
                    </div>
                    
                    <div className="border border-yellow-200 rounded-lg p-2 sm:p-3 bg-yellow-50">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-700" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-yellow-700">Late</span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-yellow-900">{latePercentage}%</div>
                      <div className="text-[10px] sm:text-xs text-yellow-600 mt-0.5 sm:mt-1">
                        {classItem.late} records
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[var(--muted-foreground)]">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium">{classItem.totalStudents} {classItem.totalStudents === 1 ? 'student' : 'students'}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[var(--foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] text-xs sm:text-sm h-8 sm:h-9"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClassClick(classItem.classId || classItem.id)
                  }}
                >
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">View</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
