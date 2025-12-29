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

interface AttendancePageClientProps {
  attendanceData: ClassAttendance[]
}

export function AttendancePageClient({ attendanceData }: AttendancePageClientProps) {
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
    if (!dateRange) {
      return attendanceData || []
    }
    
    return (attendanceData || []).filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= dateRange.start && itemDate <= dateRange.end
    })
  }, [dateRange, attendanceData])

  const handleClassClick = (classId: string) => {
    setSelectedClassId(classId)
  }

  const handleBackToOverview = () => {
    setSelectedClassId(null)
  }

  const handleStudentClick = (studentId: string) => {
    const classData = filteredData.find(c => c.id === selectedClassId)
    if (!classData) return

    const student = classData.students.find(s => s.id === studentId)
    if (!student) return

    setSelectedStudentId(student.id)
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

  const selectedClass = selectedClassId 
    ? filteredData.find(c => c.id === selectedClassId) 
    : null

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
      />
    </div>
  )
}
