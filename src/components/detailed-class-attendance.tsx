'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  CheckCircle, 
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
  
  // Get week days for week view
  const getWeekDays = () => {
    if (!dateRange || filterType !== 'week') return []
    
    const days: { day: string; date: Date; shortDay: string }[] = []
    // Handle both Date objects and string dates
    const start = dateRange.start instanceof Date ? dateRange.start : new Date(dateRange.start)
    const end = dateRange.end instanceof Date ? dateRange.end : new Date(dateRange.end)
    
    // Get Monday to Friday (weekdays)
    const current = new Date(start)
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // Only include weekdays (Monday = 1, Friday = 5)
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
  
  const weekDays = getWeekDays()
  const showWeekBreakdown = filterType === 'week' && weekDays.length > 0
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
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

  const getWeeklyStatusIcon = (status: string, day: string, time?: string) => {
    const baseClasses = "w-4 h-4 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
    const tooltipText = status === 'LATE' && time 
      ? `${day}: ${status} (arrived at ${time})`
      : `${day}: ${status}`
    
    switch (status) {
      case 'PRESENT':
        return (
          <div 
            className={`${baseClasses} bg-green-500 hover:bg-green-600`}
            title={tooltipText}
          />
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 hover:bg-red-600`}
            title={tooltipText}
          />
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600`}
            title={tooltipText}
          />
        )
      case 'NOT_SCHEDULED':
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={`${day}: Not scheduled`}
          />
        )
      default:
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={`${day}: Unknown status`}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{classDetails.name}</h2>
            <p className="text-sm text-gray-600">
              {formatDate(classDetails.date)} • {classDetails.teacher}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {classDetails.totalStudents} students
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {classDetails.totalStudents > 0 
              ? `${Math.round(((classDetails.present + classDetails.late) / classDetails.totalStudents) * 100)}% attendance`
              : '0% attendance'}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(() => {
          // Calculate total attendance for the week
          const total = classDetails.present + classDetails.absent + classDetails.late
          const presentPercentage = total > 0 ? Math.round((classDetails.present / total) * 100) : 0
          const absentPercentage = total > 0 ? Math.round((classDetails.absent / total) * 100) : 0
          const latePercentage = total > 0 ? Math.round((classDetails.late / total) * 100) : 0
          
          return (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-2xl font-bold text-green-700 leading-tight">{presentPercentage}%</div>
                      <div className="text-sm text-green-600 leading-tight">Present</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-2xl font-bold text-red-700 leading-tight">{absentPercentage}%</div>
                      <div className="text-sm text-red-600 leading-tight">Absent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="text-2xl font-bold text-yellow-700 leading-tight">{latePercentage}%</div>
                      <div className="text-sm text-yellow-600 leading-tight">Late</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )
        })()}
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {classDetails.students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
              <p className="text-sm text-[var(--muted-foreground)]">No students enrolled in this class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    {showWeekBreakdown ? (
                      <>
                        {weekDays.map((day) => (
                          <TableHead key={day.date.toISOString()} className="text-center min-w-[60px]">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-medium">{day.shortDay}</span>
                              <span className="text-xs text-gray-500">
                                {day.date.getDate()}/{day.date.getMonth() + 1}
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </>
                    ) : (
                      <>
                        <TableHead className="hidden md:table-cell">Time</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...classDetails.students]
                    .sort((a, b) => {
                      // Extract firstName and lastName from name (format: "FirstName LastName")
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
                      // Get attendance status for each day of the week
                      const getDayStatus = (dayDate: Date) => {
                        if (!student.weeklyAttendance || student.weeklyAttendance.length === 0) {
                          return 'NOT_SCHEDULED'
                        }
                        const dateKey = dayDate.toISOString().split('T')[0]
                        const dayAttendance = student.weeklyAttendance.find(
                          (wa: any) => wa.date === dateKey || new Date(wa.date).toISOString().split('T')[0] === dateKey
                        )
                        return dayAttendance?.status || 'NOT_SCHEDULED'
                      }
                      
                      return (
                        <TableRow 
                          key={student.id} 
                          className="hover:bg-[var(--muted)]/50 cursor-pointer"
                          onClick={() => onStudentClick(student.id)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{student.name}</p>
                            </div>
                          </TableCell>
                          {showWeekBreakdown ? (
                            weekDays.map((day) => {
                              const dayStatus = getDayStatus(day.date)
                              const dayAttendance = student.weeklyAttendance?.find(
                                (wa: any) => {
                                  const waDate = typeof wa.date === 'string' ? wa.date : new Date(wa.date).toISOString().split('T')[0]
                                  const dayDateKey = day.date.toISOString().split('T')[0]
                                  return waDate === dayDateKey
                                }
                              )
                              return (
                                <TableCell key={day.date.toISOString()} className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    {getWeeklyStatusIcon(dayStatus, day.shortDay, dayAttendance?.time)}
                                    {dayAttendance?.time && (
                                      <span className="text-xs text-gray-500">{dayAttendance.time}</span>
                                    )}
                                  </div>
                                </TableCell>
                              )
                            })
                          ) : (
                            <>
                              <TableCell className="hidden md:table-cell text-[var(--muted-foreground)]">
                                {student.time || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    student.status === 'PRESENT'
                                      ? 'bg-green-50 text-green-700 border-green-200 border-0'
                                      : student.status === 'ABSENT'
                                      ? 'bg-red-50 text-red-700 border-red-200 border-0'
                                      : student.status === 'LATE'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200 border-0'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 border-0'
                                  }
                                >
                                  <div className="flex items-center gap-1.5">
                                    {student.status === 'PRESENT' && <CheckCircle className="h-3 w-3" />}
                                    {student.status === 'ABSENT' && <XCircle className="h-3 w-3" />}
                                    {student.status === 'LATE' && <Clock className="h-3 w-3" />}
                                    {student.status || 'Unmarked'}
                                  </div>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
