'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  X,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
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
  Shield
} from 'lucide-react'

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
  overallAttendance: number
  weeklyAttendance: {
    day: string
    date: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
    time?: string
  }[]
  recentTrend: 'up' | 'down' | 'stable'
}

interface StudentDetailModalProps {
  student: StudentDetail | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (student: StudentDetail) => void
  onDelete?: (studentId: string) => void
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
  startInEditMode = false, 
  classes = [] 
}: StudentDetailModalProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [showDateRange, setShowDateRange] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [filteredStudent, setFilteredStudent] = useState(student)

  useEffect(() => {
    if (student) {
      setFilteredStudent(student)
    }
  }, [student])

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
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
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

  const formatWeekRange = (date: Date) => {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return `${start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const handlePreviousWeek = () => {
    const previousWeek = new Date(selectedWeek)
    previousWeek.setDate(previousWeek.getDate() - 7)
    setSelectedWeek(previousWeek)
    // In a real app, you would fetch student data for the selected week
    console.log('Previous week selected:', previousWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedWeek)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    // Don't allow future weeks
    const today = new Date()
    if (nextWeek <= today) {
      setSelectedWeek(nextWeek)
      // In a real app, you would fetch student data for the selected week
      console.log('Next week selected:', nextWeek)
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
      
      // Don't allow future dates
      if (startDate <= today && endDate <= today) {
        setSelectedWeek(startDate)
        console.log('Custom date range selected:', startDate, 'to', endDate)
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

  return (
    <div 
      className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{student.name}</h2>
                <p className="text-sm text-gray-600">{student.class} • {student.teacher}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(student)}
                >
                  Edit
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Student Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-lg font-semibold text-gray-900">{student.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Age & Grade</label>
                    <p className="text-gray-900">Age {student.age}, Grade {student.grade}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-gray-900">{student.dateOfBirth}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {student.address}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Class & Teacher</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      {student.class} - {student.teacher}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Enrollment Date</label>
                    <p className="text-gray-900">{student.enrollmentDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge className={student.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {student.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Parent Name</label>
                    <p className="text-gray-900">{student.parentName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {student.parentEmail}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {student.parentPhone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      {student.emergencyContact}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Allergies</label>
                  <p className="text-gray-900 flex items-center gap-2">
                    {student.allergies && student.allergies !== 'None' ? (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    {student.allergies || 'No known allergies'}
                  </p>
                </div>
                {student.medicalNotes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Medical Notes</label>
                    <p className="text-gray-900">{student.medicalNotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Week Navigation */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Week Navigation */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousWeek}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="text-center min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatWeekRange(selectedWeek)}
                      </div>
                      <div className="text-xs text-gray-500">Week View</div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextWeek}
                      disabled={new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000) > new Date()}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCurrentWeek}
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-4 w-4" />
                      This Week
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDateRange(!showDateRange)}
                      className={`flex items-center gap-1 ${
                        showDateRange 
                          ? 'bg-gray-100 border-gray-300 text-gray-900' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      Custom Range
                    </Button>
                  </div>
                </div>

                {/* Custom Date Range Picker */}
                {showDateRange && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-300 bg-white"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-300 bg-white"
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

              {/* Attendance Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {student.overallAttendance}%
                      </div>
                      <div className="text-sm text-gray-600">Overall Attendance</div>
                      <div className={`flex items-center justify-center gap-1 mt-2 ${getTrendColor(student.recentTrend)}`}>
                        {getTrendIcon(student.recentTrend)}
                        <span className="text-xs">
                          {student.recentTrend === 'up' ? 'Improving' : 
                           student.recentTrend === 'down' ? 'Declining' : 'Stable'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-700 mb-2">
                        {student.weeklyAttendance?.filter(d => d.status === 'PRESENT' || d.status === 'LATE').length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Present This Week</div>
                      <div className="text-xs text-gray-500 mt-1">
                        out of {student.weeklyAttendance?.filter(d => d.status !== 'NOT_SCHEDULED').length || 0} scheduled days
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Attendance Details */}
              <div className="space-y-3">
                {student.weeklyAttendance?.map((day, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(day.status)}
                      <div>
                        <div className="font-medium text-gray-900">{day.day}</div>
                        <div className="text-sm text-gray-500">{day.date}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {day.time && (
                        <div className="text-sm text-gray-500 min-w-[60px] text-right">{day.time}</div>
                      )}
                      <div className="min-w-[80px] text-right">
                        <Badge className={`${getStatusColor(day.status)} w-full justify-center`}>
                          {day.status === 'NOT_SCHEDULED' ? 'Not Scheduled' : day.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}