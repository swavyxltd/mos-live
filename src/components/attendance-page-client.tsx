'use client'

import { useState, useEffect } from 'react'
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
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [filteredData, setFilteredData] = useState(attendanceData || [])

  // Filter data by week
  useEffect(() => {
    const weekStart = new Date(currentWeek)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday
    weekEnd.setHours(23, 59, 59, 999)
    
    const filtered = (attendanceData || []).filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= weekStart && itemDate <= weekEnd
    })
    
    setFilteredData(filtered)
  }, [currentWeek, attendanceData])

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

    // Create detailed student data for the modal
    const studentDetail = {
      id: student.id,
      name: student.name,
      class: classData.name,
      teacher: classData.teacher,
      overallAttendance: student.attendancePercentage || 0,
      weeklyAttendance: student.weeklyAttendance || [],
      recentTrend: (student.attendancePercentage || 0) >= 95 ? 'up' : 
                  (student.attendancePercentage || 0) < 90 ? 'down' : 'stable'
    }

    setSelectedStudent(studentDetail)
    setIsStudentModalOpen(true)
  }

  const handleCloseStudentModal = () => {
    setIsStudentModalOpen(false)
    setSelectedStudent(null)
  }

  const handleWeekChange = (week: Date) => {
    setCurrentWeek(week)
    // Data will be updated automatically via useEffect
  }

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setCurrentWeek(startDate)
  }

  const selectedClass = selectedClassId 
    ? filteredData.find(c => c.id === selectedClassId) 
    : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage student attendance.
          </p>
        </div>
        <RestrictedAction action="attendance">
          <AttendanceMarking />
        </RestrictedAction>
      </div>

      {/* Week Filter */}
      <AttendanceWeekFilter
        currentWeek={currentWeek}
        onWeekChange={handleWeekChange}
        onDateRangeChange={handleDateRangeChange}
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
        />
      ) : null}

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={isStudentModalOpen}
        onClose={handleCloseStudentModal}
      />
    </div>
  )
}
