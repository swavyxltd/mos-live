'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AttendanceMarking } from '@/components/attendance-marking'
import { ClassAttendanceOverview } from '@/components/class-attendance-overview'
import { DetailedClassAttendance } from '@/components/detailed-class-attendance'
import { StudentDetailModal } from '@/components/student-detail-modal'
import { AttendanceWeekFilter } from '@/components/attendance-week-filter'
import { RestrictedAction } from '@/components/restricted-action'

interface Student {
  id: string
  name: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  time?: string
  attendancePercentage: number
  weeklyAttendance: {
    day: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
    time?: string
  }[]
}

interface ClassAttendance {
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

interface ActiveClass {
  id: string
  name: string
  teacher: string
  totalStudents: number
}

interface AttendancePageClientProps {
  attendanceData: ClassAttendance[]
  allActiveClasses?: ActiveClass[]
}

export function AttendancePageClient({ attendanceData, allActiveClasses = [] }: AttendancePageClientProps) {
  const searchParams = useSearchParams()
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [filterType, setFilterType] = useState<'week' | 'month' | 'year'>('week')
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)

  // Listen for attendance saved event to refresh page
  useEffect(() => {
    const handleAttendanceSaved = () => {
      window.location.reload()
    }
    
    window.addEventListener('attendance-saved', handleAttendanceSaved)
    
    return () => {
      window.removeEventListener('attendance-saved', handleAttendanceSaved)
    }
  }, [])

  // Handle student query parameter from URL
  useEffect(() => {
    const studentId = searchParams.get('student')
    if (studentId) {
      // Find which class this student belongs to by searching attendance data
      const studentClass = attendanceData.find(classData => 
        classData.students.some(s => s.id === studentId)
      )
      if (studentClass) {
        setSelectedClassId(studentClass.classId)
        setSelectedStudentId(studentId)
        setIsStudentModalOpen(true)
        // Clean up URL
        window.history.replaceState({}, '', '/attendance')
      }
    }
  }, [searchParams, attendanceData])

  // Filter data based on selected filter type and date range
  const filteredData = useMemo(() => {
    const data = attendanceData || []
    
    // If no date range is set yet, show all data (will be filtered once dateRange is set)
    if (!dateRange) {
      return data
    }
    
    // Normalize dates to midnight for accurate comparison
    const normalizeDate = (date: Date | string) => {
      const d = new Date(date)
      // Handle ISO string dates
      if (typeof date === 'string' && date.includes('T')) {
        // Extract just the date part (YYYY-MM-DD)
        const datePart = date.split('T')[0]
        const [year, month, day] = datePart.split('-').map(Number)
        return new Date(year, month - 1, day, 0, 0, 0, 0)
      }
      d.setHours(0, 0, 0, 0)
      return d
    }
    
    const rangeStart = normalizeDate(dateRange.start)
    const rangeEnd = normalizeDate(dateRange.end)
    rangeEnd.setHours(23, 59, 59, 999) // Include the entire end date
    
    const filtered = data.filter(item => {
      const itemDate = normalizeDate(item.date)
      return itemDate >= rangeStart && itemDate <= rangeEnd
    })
    
    return filtered
  }, [dateRange, attendanceData])

  const handleClassClick = (classId: string) => {
    setSelectedClassId(classId)
  }

  const handleBackToOverview = () => {
    setSelectedClassId(null)
  }

  const handleStudentClick = (studentId: string) => {
    console.log('handleStudentClick called with:', studentId)
    console.log('selectedClass:', selectedClass)
    console.log('selectedClassId:', selectedClassId)
    
    // If we're viewing a detailed class, use selectedClass
    if (selectedClass) {
      const student = selectedClass.students.find(s => s.id === studentId)
      console.log('Found student in selectedClass:', student)
      if (student) {
        setSelectedStudentId(student.id)
        setIsStudentModalOpen(true)
        console.log('Opening modal with student:', student.id)
        return
      }
    }
    
    // Otherwise, try to find in filteredData
    const classData = filteredData.find(c => {
      const classId = (c as any).classId || (c.id.includes('-') ? c.id.split('-')[0] : c.id)
      return classId === selectedClassId || c.id === selectedClassId
    })
    
    console.log('Found classData:', classData)
    if (classData) {
      const student = classData.students.find(s => s.id === studentId)
      console.log('Found student in classData:', student)
      if (student) {
        setSelectedStudentId(student.id)
        setIsStudentModalOpen(true)
        console.log('Opening modal with student:', student.id)
        return
      }
    }
    
    // If still not found, just use the studentId directly
    console.log('Using studentId directly:', studentId)
    setSelectedStudentId(studentId)
    setIsStudentModalOpen(true)
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false)
    setSelectedStudentId(null)
  }

  const handleWeekChange = (week: Date) => {
    setCurrentWeek(week)
    // Data will be updated automatically via useEffect
  }

  const handleDateRangeChange = useCallback((startDate: Date, endDate: Date) => {
    // Only update dateRange, don't update currentWeek to prevent infinite loops
    // currentWeek is only updated by handleWeekChange (user clicking prev/next/current)
    setDateRange({ start: startDate, end: endDate })
  }, [])

  const handleFilterTypeChange = (type: 'week' | 'month' | 'year') => {
    setFilterType(type)
  }

  // Aggregate all entries for the selected class within the date range
  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null
    
    // For yearly view, use all attendance data, not just filtered data
    // This ensures we have all attendance records for the entire year
    const dataSource = filterType === 'year' ? attendanceData : filteredData
    
    // Find all entries for this class
    const classEntries = dataSource.filter(c => {
      const classId = (c as any).classId || (c.id.includes('-') ? c.id.split('-')[0] : c.id)
      return classId === selectedClassId || c.id === selectedClassId
    })
    
    if (classEntries.length === 0) return null
    
    // If only one entry, return it
    if (classEntries.length === 1) {
      return classEntries[0]
    }
    
    // Aggregate multiple entries (for week/month view with multiple dates)
    // Sort by date descending to get the most recent entry first
    const sortedEntries = [...classEntries].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
    
    const mostRecentEntry = sortedEntries[0]
    const aggregatedStudents = new Map<string, Student>()
    
    // Build attendance map for all dates in the range
    const allAttendanceByStudent = new Map<string, Map<string, { status: string; time?: string }>>()
    
    // Collect all students and their attendance across all dates
    sortedEntries.forEach(entry => {
      // Handle both Date objects and ISO strings
      const entryDate = typeof entry.date === 'string' ? new Date(entry.date) : entry.date
      const entryDateKey = entryDate.toISOString().split('T')[0]
      
      entry.students.forEach((student: Student) => {
        if (!aggregatedStudents.has(student.id)) {
          aggregatedStudents.set(student.id, {
            ...student,
            weeklyAttendance: [] // Will be rebuilt from all dates
          })
          allAttendanceByStudent.set(student.id, new Map())
        }
        
        const studentMap = allAttendanceByStudent.get(student.id)!
        
        // Add attendance from the entry date itself (this is the actual attendance for that date)
        // This is the key: each entry represents one date, and student.status is the attendance for that date
        // For yearly/monthly views, we collect all these dates across all entries
        if (student.status && student.status !== 'UNMARKED') {
          // Only add if not already set (in case of duplicates)
          if (!studentMap.has(entryDateKey)) {
            studentMap.set(entryDateKey, {
              status: student.status,
              time: student.time
            })
          }
        }
        
        // For week view, also add weekly attendance from this entry (for days in the week)
        // For month/year views, we only use the entry date attendance above
        if (filterType === 'week' && student.weeklyAttendance) {
          student.weeklyAttendance.forEach((wa: any) => {
            const dateKey = typeof wa.date === 'string' 
              ? wa.date 
              : new Date(wa.date).toISOString().split('T')[0]
            // Only add if not already set (prioritize actual entry date attendance)
            if (!studentMap.has(dateKey) && wa.status !== 'NOT_SCHEDULED') {
              studentMap.set(dateKey, {
                status: wa.status,
                time: wa.time
              })
            }
          })
        }
      })
    })
    
    // Rebuild weeklyAttendance for each student from all collected dates
    aggregatedStudents.forEach((student, studentId) => {
      const attendanceMap = allAttendanceByStudent.get(studentId)!
      const weeklyAttendance: any[] = []
      
      attendanceMap.forEach((attendance, dateKey) => {
        const date = new Date(dateKey)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        weeklyAttendance.push({
          day: dayNames[date.getDay()],
          date: dateKey,
          status: attendance.status,
          time: attendance.time
        })
      })
      
      // Sort by date
      weeklyAttendance.sort((a, b) => a.date.localeCompare(b.date))
      
      student.weeklyAttendance = weeklyAttendance
    })
    
    // Calculate totals across all dates
    const totalPresent = classEntries.reduce((sum, e) => sum + e.present, 0)
    const totalAbsent = classEntries.reduce((sum, e) => sum + e.absent, 0)
    const totalLate = classEntries.reduce((sum, e) => sum + e.late, 0)
    
    const result = {
      ...mostRecentEntry,
      id: mostRecentEntry.classId || mostRecentEntry.id,
      classId: mostRecentEntry.classId || mostRecentEntry.id.split('-')[0],
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      students: Array.from(aggregatedStudents.values()),
      // Use the most recent date for display
      date: mostRecentEntry.date
    }
    
    // Debug: Log student attendance counts for yearly view
    if (filterType === 'year') {
      console.log(`📊 Yearly view - Class: ${result.name}, Entries: ${classEntries.length}`)
      result.students.forEach(student => {
        const attendanceCount = student.weeklyAttendance?.length || 0
        console.log(`  Student ${student.name}: ${attendanceCount} attendance records`)
        if (attendanceCount === 0) {
          console.warn(`⚠️ Student ${student.name} has no attendance records in yearly view`)
        } else {
          // Log first and last dates
          const sortedDates = [...(student.weeklyAttendance || [])].sort((a, b) => 
            a.date.localeCompare(b.date)
          )
          if (sortedDates.length > 0) {
            console.log(`    First: ${sortedDates[0].date}, Last: ${sortedDates[sortedDates.length - 1].date}`)
          }
        }
      })
    }
    
    return result
  }, [selectedClassId, filteredData, attendanceData, filterType])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Attendance</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Track and manage student attendance across all classes
          </p>
        </div>
        <RestrictedAction action="attendance">
          <AttendanceMarking />
        </RestrictedAction>
      </div>

      {/* Week/Month/Year Filter */}
      <AttendanceWeekFilter
        currentWeek={currentWeek}
        onWeekChange={handleWeekChange}
        onDateRangeChange={handleDateRangeChange}
        filterType={filterType}
        onFilterTypeChange={handleFilterTypeChange}
      />

      {/* Content */}
      {!selectedClassId ? (
        <ClassAttendanceOverview 
          classes={filteredData}
          onClassClick={handleClassClick}
          onStudentClick={handleStudentClick}
          filterType={filterType}
          dateRange={dateRange}
          allActiveClasses={allActiveClasses}
        />
      ) : selectedClass ? (
        <DetailedClassAttendance
          classDetails={selectedClass}
          onBack={handleBackToOverview}
          onStudentClick={handleStudentClick}
          filterType={filterType}
          dateRange={dateRange}
        />
      ) : null}

      {/* Student Detail Modal */}
      <StudentDetailModal
        studentId={selectedStudentId}
        isOpen={isStudentModalOpen}
        onClose={handleCloseStudentModal}
        initialTab="attendance"
      />
    </div>
  )
}
