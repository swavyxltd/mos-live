'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArchiveButton } from '@/components/archive-button'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  X,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mail,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  GraduationCap,
  UserCheck,
  Shield,
  Archive,
  Edit
} from 'lucide-react'
import { getAttendanceTrend } from '@/lib/attendance-ratings'
import { PhoneLink } from './phone-link'
import { toast } from 'sonner'

interface AttendanceDay {
  day: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
  time?: string
}

interface StudentDetail {
  id: string
  name: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  grade: string
  address: string
  class: string
  teacher: string
  parentName: string
  parentEmail: string
  parentPhone: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  enrollmentDate: string
  status: 'ACTIVE' | 'INACTIVE'
  isArchived: boolean
  archivedAt?: string
  overallAttendance: number
  weeklyAttendance: AttendanceDay[]
  recentTrend: 'up' | 'down' | 'stable'
}

interface StudentDetailModalProps {
  student: StudentDetail | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (student: StudentDetail) => void
  onDelete?: (studentId: string) => void
  onArchive?: (studentId: string, isArchived: boolean) => void
  startInEditMode?: boolean
  classes?: Array<{
    id: string
    name: string
  }>
}

export function StudentDetailModal({ 
  student, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  onArchive,
  startInEditMode = false, 
  classes = [] 
}: StudentDetailModalProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [showDateRange, setShowDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [filteredStudent, setFilteredStudent] = useState(student)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceDay[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [scheduledDays, setScheduledDays] = useState<string[]>([]) // Store scheduled days from API

  const fetchMonthlyAttendance = useCallback(async () => {
    if (!student) return
    
    setIsLoadingAttendance(true)
    try {
      // Get the start of the selected week
      const weekStart = new Date(selectedWeek)
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // Monday
      weekStart.setDate(diff)
      weekStart.setHours(0, 0, 0, 0)

      // Get 4 weeks of data (month)
      const monthStart = new Date(weekStart)
      monthStart.setDate(monthStart.getDate() - 21) // Go back 3 weeks to get 4 weeks total
      
      const monthEnd = new Date(weekStart)
      monthEnd.setDate(monthEnd.getDate() + 6) // End of selected week
      monthEnd.setHours(23, 59, 59, 999)

      const response = await fetch(
        `/api/students/${student.id}/attendance?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`
      )
      
      if (response.ok) {
        const responseData = await response.json()
        const attendanceData = responseData.attendance || responseData // Support both old and new format
        const apiScheduledDays = responseData.scheduledDays || [] // Get scheduled days from API
        
        // Store scheduled days in state
        setScheduledDays(apiScheduledDays)
        
        // Map full day names to abbreviations
        const dayNameMap: { [key: string]: string } = {
          'Monday': 'Mon',
          'Tuesday': 'Tue',
          'Wednesday': 'Wed',
          'Thursday': 'Thu',
          'Friday': 'Fri',
          'Saturday': 'Sat',
          'Sunday': 'Sun'
        }
        
        // Normalize scheduled days to abbreviations
        const scheduledDayAbbrevs = apiScheduledDays.map((day: string) => dayNameMap[day] || day)
        
        // Transform the attendance data to match our format
        const attendanceDays: AttendanceDay[] = []
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        // Generate all days in the month range, but ONLY include scheduled days
        const currentDate = new Date(monthStart)
        while (currentDate <= monthEnd) {
          const dayIndex = currentDate.getDay()
          const dayName = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1] // Convert Sunday=0 to Monday=0
          const fullDayName = fullDayNames[dayIndex === 0 ? 6 : dayIndex - 1]
          
          // Only include days that are in the scheduled days list
          // If no scheduled days, don't show any days (student not enrolled in any classes)
          const isScheduled = scheduledDayAbbrevs.length > 0 
            ? (scheduledDayAbbrevs.includes(dayName) || apiScheduledDays.includes(fullDayName))
            : false // If no schedule info, don't show any days
          
          // Only add scheduled days to the list
          if (isScheduled) {
            const dayAttendance = attendanceData.find((a: any) => {
              const aDate = new Date(a.date)
              return aDate.toDateString() === currentDate.toDateString()
            })

            attendanceDays.push({
              day: dayName,
              date: currentDate.toISOString().split('T')[0],
              status: dayAttendance?.status || 'ABSENT',
              time: dayAttendance?.time || undefined
            })
          }
          
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        setMonthlyAttendance(attendanceDays)
      }
    } catch (error) {
    } finally {
      setIsLoadingAttendance(false)
    }
  }, [student, selectedWeek])

  useEffect(() => {
    if (student && isOpen) {
      setFilteredStudent(student)
      fetchMonthlyAttendance()
    }
  }, [student, isOpen, fetchMonthlyAttendance])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !student) return null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'ABSENT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

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

  const formatWeekRange = (date: Date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const handlePreviousWeek = () => {
    const previousWeek = new Date(selectedWeek)
    previousWeek.setDate(previousWeek.getDate() - 7)
    setSelectedWeek(previousWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedWeek)
    nextWeek.setDate(nextWeek.getDate() + 7)
    if (nextWeek <= new Date()) {
      setSelectedWeek(nextWeek)
    }
  }

  const handleCurrentWeek = () => {
    setSelectedWeek(new Date())
  }

  const handleCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate)
      const endDate = new Date(customEndDate)
      const today = new Date()
      
      if (startDate <= today && endDate <= today) {
        setSelectedWeek(startDate)
        setShowDateRange(false)
      }
    }
  }

  const handleClearCustomRange = () => {
    setCustomStartDate('')
    setCustomEndDate('')
    setShowDateRange(false)
    setSelectedWeek(new Date())
  }

  const handleConfirmArchive = async () => {
    if (!student || !onArchive) return
    
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/students/${student.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive student')
      }

      const data = await response.json()
      onArchive(student.id, true)
      toast.success('Student archived successfully')
      setIsArchiveDialogOpen(false)
    } catch (error) {
      toast.error('Failed to archive student')
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="w-full max-w-4xl my-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef2ff]">
                      <User className="h-5 w-5 text-[#1d4ed8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                        {student.name}
                      </h2>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {student.class} • {student.teacher}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        student.isArchived
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : student.status === 'ACTIVE'
                            ? 'bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]'
                            : 'bg-[#f5f5f5] text-[#374151] border border-[#e5e7eb]'
                      }
                    >
                      {student.isArchived ? 'ARCHIVED' : student.status}
                    </Badge>
                    {student.overallAttendance !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {student.overallAttendance}% Attendance
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(student)}
                      className="hidden sm:flex"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {onArchive && (
                    <>
                      {student.isArchived ? (
                        <ArchiveButton
                          id={student.id}
                          type="student"
                          isArchived={student.isArchived}
                          onArchiveChange={onArchive}
                        />
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsArchiveDialogOpen(true)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Archive</span>
                        </Button>
                      )}
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Student Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Student Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Full Name</label>
                          <p className="text-sm font-medium text-[var(--foreground)]">{student.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Age & Grade</label>
                          <p className="text-sm text-[var(--foreground)]">Age {student.age}, Grade {student.grade}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Date of Birth</label>
                          <p className="text-sm text-[var(--foreground)]">{student.dateOfBirth}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Class & Teacher</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-[var(--muted-foreground)]" />
                            {student.class} - {student.teacher}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Enrollment Date</label>
                          <p className="text-sm text-[var(--foreground)]">{student.enrollmentDate}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Address</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            <span className="truncate">{student.address}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <UserCheck className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Parent Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Parent Name</label>
                          <p className="text-sm text-[var(--foreground)]">{student.parentName}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Email</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2 truncate">
                            <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            <span className="truncate">{student.parentEmail}</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Phone</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            <PhoneLink phone={student.parentPhone} />
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Emergency Contact</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <Shield className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            {student.emergencyContact}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Heart className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Medical Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[var(--muted-foreground)]">Allergies</label>
                        <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                          {student.allergies && student.allergies !== 'None' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                          {student.allergies || 'No known allergies'}
                        </p>
                      </div>
                      {student.medicalNotes && (
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Medical Notes</label>
                          <p className="text-sm text-[var(--foreground)]">{student.medicalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Section */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Attendance Information</h3>
                    
                    {/* Attendance Overview - Show metrics first */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Overall</div>
                          {getTrendIcon(student.recentTrend)}
                        </div>
                        <div className="text-4xl font-bold text-blue-600 mb-1">
                          {student.overallAttendance}%
                        </div>
                        <div className="text-sm text-blue-600/70">Attendance Rate</div>
                        <div className={`flex items-center gap-1 mt-3 text-xs ${getTrendColor(student.recentTrend)}`}>
                          <span>
                            {student.recentTrend === 'up' ? '↗ Improving' : 
                             student.recentTrend === 'down' ? '↘ Declining' : '→ Stable'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                        <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">This Week</div>
                        <div className="text-4xl font-bold text-green-600 mb-1">
                          {(() => {
                            const weekStart = new Date(selectedWeek)
                            const dayOfWeek = weekStart.getDay()
                            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                            weekStart.setDate(diff)
                            weekStart.setHours(0, 0, 0, 0)
                            
                            const weekEnd = new Date(weekStart)
                            weekEnd.setDate(weekEnd.getDate() + 6)
                            weekEnd.setHours(23, 59, 59, 999)
                            
                            const weekData = monthlyAttendance.filter(day => {
                              const dayDate = new Date(day.date)
                              return dayDate >= weekStart && dayDate <= weekEnd
                            })
                            
                            return weekData.filter(d => d.status === 'PRESENT' || d.status === 'LATE').length
                          })()}
                        </div>
                        <div className="text-sm text-green-600/70">Days Present</div>
                        <div className="text-xs text-green-600/60 mt-3">
                          {(() => {
                            const weekStart = new Date(selectedWeek)
                            const dayOfWeek = weekStart.getDay()
                            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                            weekStart.setDate(diff)
                            weekStart.setHours(0, 0, 0, 0)
                            
                            const weekEnd = new Date(weekStart)
                            weekEnd.setDate(weekEnd.getDate() + 6)
                            weekEnd.setHours(23, 59, 59, 999)
                            
                            const weekData = monthlyAttendance.filter(day => {
                              const dayDate = new Date(day.date)
                              return dayDate >= weekStart && dayDate <= weekEnd
                            })
                            
                            return weekData.filter(d => d.status !== 'NOT_SCHEDULED').length
                          })()} scheduled days
                        </div>
                      </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousWeek}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          <div className="text-center min-w-0 flex-1 px-2">
                            <div className="text-sm font-semibold text-[var(--foreground)]">
                              {formatWeekRange(selectedWeek)}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)]">Week View</div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextWeek}
                            disabled={new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000) > new Date()}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCurrentWeek}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">This Week</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDateRange(!showDateRange)}
                            className={`flex items-center gap-1.5 text-xs ${
                              showDateRange 
                                ? 'bg-[var(--accent)] border-[var(--ring)]' 
                                : ''
                            }`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Range</span>
                          </Button>
                        </div>
                      </div>

                      {/* Custom Date Range Picker */}
                      {showDateRange && (
                        <div className="p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--ring)] bg-[var(--background)] text-[var(--foreground)]"
                              />
                            </div>
                            
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--ring)] bg-[var(--background)] text-[var(--foreground)]"
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
                    </div>


                    {/* Weekly Attendance Details */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Daily Attendance</div>
                      {isLoadingAttendance ? (
                        <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                          Loading attendance data...
                        </div>
                      ) : monthlyAttendance && monthlyAttendance.length > 0 ? (
                        // Filter to show only the selected week
                        monthlyAttendance
                          .filter(day => {
                            const dayDate = new Date(day.date)
                            const weekStart = new Date(selectedWeek)
                            const dayOfWeek = weekStart.getDay()
                            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                            weekStart.setDate(diff)
                            weekStart.setHours(0, 0, 0, 0)
                            
                            const weekEnd = new Date(weekStart)
                            weekEnd.setDate(weekEnd.getDate() + 6)
                            weekEnd.setHours(23, 59, 59, 999)
                            
                            return dayDate >= weekStart && dayDate <= weekEnd
                          })
                          .map((day, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {getStatusIcon(day.status)}
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-[var(--foreground)]">{day.day}</div>
                                <div className="text-xs text-[var(--muted-foreground)]">{day.date}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {day.time && (
                                <div className="text-xs text-[var(--muted-foreground)] min-w-[50px] text-right font-mono">{day.time}</div>
                              )}
                              <div className="min-w-[100px] text-right">
                                <Badge className={`${getStatusColor(day.status)} justify-center text-xs px-2 py-0.5`}>
                                  {day.status === 'NOT_SCHEDULED' ? 'Not Scheduled' : day.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
                          No attendance data for this week
                        </div>
                      )}
                    </div>
                    
                    {/* Monthly View - Show all 4 weeks */}
                    {monthlyAttendance.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-[var(--border)]">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Monthly View (Last 4 Weeks)</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {Array.from({ length: 4 }, (_, weekIndex) => {
                            const weekStart = new Date(selectedWeek)
                            const dayOfWeek = weekStart.getDay()
                            const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
                            weekStart.setDate(diff)
                            weekStart.setDate(weekStart.getDate() - (3 - weekIndex) * 7)
                            weekStart.setHours(0, 0, 0, 0)
                            
                            const weekEnd = new Date(weekStart)
                            weekEnd.setDate(weekEnd.getDate() + 6)
                            weekEnd.setHours(23, 59, 59, 999)
                            
                            const weekData = monthlyAttendance.filter(day => {
                              const dayDate = new Date(day.date)
                              return dayDate >= weekStart && dayDate <= weekEnd
                            })
                            
                            const presentCount = weekData.filter(d => d.status === 'PRESENT' || d.status === 'LATE').length
                            const totalScheduled = weekData.filter(d => d.status !== 'NOT_SCHEDULED').length
                            const weekPercentage = totalScheduled > 0 ? Math.round((presentCount / totalScheduled) * 100) : 0
                            
                            return (
                              <div key={weekIndex} className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                                <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
                                  {weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - {weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                </div>
                                <div className="text-2xl font-bold text-[var(--foreground)] mb-1">
                                  {weekPercentage}%
                                </div>
                                <div className="text-xs text-[var(--muted-foreground)]">
                                  {presentCount}/{totalScheduled} days
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
                {onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => onEdit(student)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Student
                  </Button>
                )}
                {onArchive && !student.isArchived && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsArchiveDialogOpen(true)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Student
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Student"
        message={`Are you sure you want to archive ${student.name}? This will disable their account and remove them from active students.`}
        confirmText="Archive Student"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isArchiving}
      />
    </>
  )
}
