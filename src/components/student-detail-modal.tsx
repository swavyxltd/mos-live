'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Mail,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  GraduationCap,
  UserCheck,
  Archive,
  Edit,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { getAttendanceRating } from '@/lib/attendance-ratings'
import { PhoneLink } from './phone-link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

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
  address: string
  class: string
  teacher: string
  parentName: string
  parentEmail: string
  parentPhone: string
  backupPhone: string
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
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [weeklyAttendance, setWeeklyAttendance] = useState<AttendanceDay[]>([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
  const [scheduledDays, setScheduledDays] = useState<string[]>([])
  const [enrollmentDate, setEnrollmentDate] = useState<Date | null>(null)

  // Get enrollment date - earliest class enrollment or student creation date
  useEffect(() => {
    if (student) {
      // Parse enrollment date from student data
      const enrollment = new Date(student.enrollmentDate)
      setEnrollmentDate(enrollment)
      
      // Set initial week to enrollment date or current week, whichever is later
      const today = new Date()
      const weekStart = getWeekStart(today)
      const enrollmentWeekStart = getWeekStart(enrollment)
      
      // If enrollment is in the future relative to current week, use enrollment week
      // Otherwise use current week
      if (enrollmentWeekStart > weekStart) {
        setSelectedWeek(enrollment)
      } else {
        setSelectedWeek(today)
      }
    }
  }, [student])

  const getWeekStart = (date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return start
  }

  const getWeekEnd = (date: Date) => {
    const end = getWeekStart(date)
    end.setDate(end.getDate() + 6) // Sunday
    end.setHours(23, 59, 59, 999)
    return end
  }

  const fetchWeeklyAttendance = useCallback(async () => {
    if (!student || !enrollmentDate) return
    
    setIsLoadingAttendance(true)
    try {
      const weekStart = getWeekStart(selectedWeek)
      const weekEnd = getWeekEnd(selectedWeek)
      
      // Don't fetch if week is before enrollment
      if (weekEnd < enrollmentDate) {
        setWeeklyAttendance([])
        setIsLoadingAttendance(false)
        return
      }

      // Adjust start date to enrollment date if week starts before enrollment
      const actualStart = weekStart < enrollmentDate ? enrollmentDate : weekStart
      
      const response = await fetch(
        `/api/students/${student.id}/attendance?startDate=${actualStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )
      
      if (response.ok) {
        const responseData = await response.json()
        const attendanceData = responseData.attendance || []
        const apiScheduledDays = responseData.scheduledDays || []
        
        setScheduledDays(apiScheduledDays)
        
        const dayNameMap: { [key: string]: string } = {
          'Monday': 'Mon',
          'Tuesday': 'Tue',
          'Wednesday': 'Wed',
          'Thursday': 'Thu',
          'Friday': 'Fri',
          'Saturday': 'Sat',
          'Sunday': 'Sun'
        }
        
        const scheduledDayAbbrevs = apiScheduledDays.map((day: string) => dayNameMap[day] || day)
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        const attendanceDays: AttendanceDay[] = []
        const currentDate = new Date(weekStart)
        
        while (currentDate <= weekEnd) {
          // Skip dates before enrollment
          if (currentDate < enrollmentDate) {
            currentDate.setDate(currentDate.getDate() + 1)
            continue
          }
          
          const dayIndex = currentDate.getDay()
          const dayName = daysOfWeek[dayIndex === 0 ? 6 : dayIndex - 1]
          const fullDayName = fullDayNames[dayIndex === 0 ? 6 : dayIndex - 1]
          
          const isScheduled = scheduledDayAbbrevs.length > 0 
            ? (scheduledDayAbbrevs.includes(dayName) || apiScheduledDays.includes(fullDayName))
            : false
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const isFuture = currentDate > today
          
          if (isScheduled) {
            const dayAttendance = attendanceData.find((a: any) => {
              const aDate = new Date(a.date)
              return aDate.toDateString() === currentDate.toDateString()
            })

            attendanceDays.push({
              day: dayName,
              date: currentDate.toISOString().split('T')[0],
              status: isFuture ? 'NOT_SCHEDULED' : (dayAttendance?.status || 'ABSENT'),
              time: dayAttendance?.time || undefined
            })
          }
          
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        setWeeklyAttendance(attendanceDays)
      }
    } catch (error) {
      console.error('Failed to fetch attendance', error)
    } finally {
      setIsLoadingAttendance(false)
    }
  }, [student, selectedWeek, enrollmentDate])

  useEffect(() => {
    if (student && isOpen && enrollmentDate) {
      fetchWeeklyAttendance()
    }
  }, [student, isOpen, selectedWeek, enrollmentDate, fetchWeeklyAttendance])

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

  const formatWeekRange = (date: Date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const handlePreviousWeek = () => {
    if (!enrollmentDate) return
    
    const previousWeek = new Date(selectedWeek)
    previousWeek.setDate(previousWeek.getDate() - 7)
    
    // Don't allow going before enrollment date
    const enrollmentWeekStart = getWeekStart(enrollmentDate)
    const newWeekStart = getWeekStart(previousWeek)
    
    if (newWeekStart >= enrollmentWeekStart) {
      setSelectedWeek(previousWeek)
    }
  }

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedWeek)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const today = new Date()
    
    // Don't allow going past today
    if (getWeekStart(nextWeek) <= getWeekStart(today)) {
      setSelectedWeek(nextWeek)
    }
  }

  const handleCurrentWeek = () => {
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

      onArchive(student.id, true)
      toast.success('Student archived successfully')
      setIsArchiveDialogOpen(false)
    } catch (error) {
      toast.error('Failed to archive student')
    } finally {
      setIsArchiving(false)
    }
  }

  const attendanceRating = getAttendanceRating(student.overallAttendance)
  const weekStart = getWeekStart(selectedWeek)
  const weekEnd = getWeekEnd(selectedWeek)
  const canGoBack = enrollmentDate ? getWeekStart(selectedWeek) > getWeekStart(enrollmentDate) : false
  const canGoForward = getWeekStart(selectedWeek) < getWeekStart(new Date())
  
  const weekPresentCount = weeklyAttendance.filter(d => d.status === 'PRESENT' || d.status === 'LATE').length
  const weekScheduledCount = weeklyAttendance.filter(d => d.status !== 'NOT_SCHEDULED').length

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
        <div className="w-[95vw] sm:w-[90vw] md:w-[70vw] lg:w-[60vw] max-w-4xl my-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--muted)]">
                      <User className="h-5 w-5 text-[var(--foreground)]" />
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
                    <Badge variant="outline" className={`${attendanceRating.bgColor} ${attendanceRating.color} ${attendanceRating.borderColor} border`}>
                      {student.overallAttendance}% • {attendanceRating.text}
                    </Badge>
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
                  {onArchive && !student.isArchived && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsArchiveDialogOpen(true)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Archive</span>
                    </Button>
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
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Student Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Student Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Full Name</label>
                          <p className="text-sm font-medium text-[var(--foreground)]">{student.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Age</label>
                          <p className="text-sm text-[var(--foreground)]">Age {student.age}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Date of Birth</label>
                          <p className="text-sm text-[var(--foreground)]">{formatDate(student.dateOfBirth)}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Class & Teacher</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-[var(--muted-foreground)]" />
                            {student.class} - {student.teacher}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Enrollment Date</label>
                          <p className="text-sm text-[var(--foreground)]">{formatDate(student.enrollmentDate)}</p>
                        </div>
                        {student.address && (
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Address</label>
                            <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                              <span className="truncate">{student.address}</span>
                            </p>
                          </div>
                        )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Parent Name</label>
                          <p className="text-sm text-[var(--foreground)]">{student.parentName || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Email</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2 truncate">
                            <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            <span className="truncate">{student.parentEmail || 'N/A'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-[var(--muted-foreground)]">Phone</label>
                          <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                            <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                            {student.parentPhone ? <PhoneLink phone={student.parentPhone} /> : 'N/A'}
                          </p>
                        </div>
                        {student.backupPhone && (
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Backup Phone</label>
                            <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                              <PhoneLink phone={student.backupPhone} />
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              {(student.allergies || student.medicalNotes) && (
                <div className="border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Heart className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Medical Information</h3>
                      <div className="space-y-2">
                        {student.allergies && (
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Allergies</label>
                            <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                              {student.allergies !== 'None' ? (
                                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                              {student.allergies || 'No known allergies'}
                            </p>
                          </div>
                        )}
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
              )}

              {/* Attendance Section */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Attendance Information</h3>
                    
                    {/* Attendance Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-[var(--muted)]/50 rounded-lg border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Overall</div>
                          <attendanceRating.icon className={`h-4 w-4 ${attendanceRating.color}`} />
                        </div>
                        <div className={`text-3xl font-bold ${attendanceRating.color} mb-1`}>
                          {student.overallAttendance}%
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Attendance Rate</div>
                        <div className={`flex items-center gap-1 mt-2 text-xs ${attendanceRating.color}`}>
                          {student.recentTrend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                           student.recentTrend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                           <Minus className="h-3 w-3" />}
                          <span>
                            {student.recentTrend === 'up' ? 'Improving' : 
                             student.recentTrend === 'down' ? 'Declining' : 'Stable'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-[var(--muted)]/50 rounded-lg border border-[var(--border)]">
                        <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">This Week</div>
                        <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
                          {weekPresentCount}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">Days Present</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-2">
                          {weekScheduledCount} scheduled days
                        </div>
                      </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-3 p-3 bg-[var(--muted)]/30 rounded-lg border border-[var(--border)]">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousWeek}
                            disabled={!canGoBack}
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
                            disabled={!canGoForward}
                            className="h-8 w-8 p-0"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCurrentWeek}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">This Week</span>
                        </Button>
                      </div>
                    </div>

                    {/* Weekly Attendance Details */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">Daily Attendance</div>
                      {isLoadingAttendance ? (
                        <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">
                          Loading attendance data...
                        </div>
                      ) : weeklyAttendance.length > 0 ? (
                        weeklyAttendance.map((day, index) => (
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
                        <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">
                          {enrollmentDate && weekEnd < enrollmentDate 
                            ? 'No attendance data - student not enrolled yet' 
                            : 'No attendance data for this week'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-[var(--border)]">
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
