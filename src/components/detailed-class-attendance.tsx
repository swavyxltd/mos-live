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
  
  const weekDays = getWeekDays()
  const showWeekBreakdown = filterType === 'week' && weekDays.length > 0
  
  const attendanceRate = classDetails.totalStudents > 0
    ? Math.round(((classDetails.present + classDetails.late) / classDetails.totalStudents) * 100)
    : 0

  const getWeeklyStatusDot = (status: string, day: string, time?: string) => {
    const baseClasses = "w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer border-2"
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
            <CheckCircle2 className="h-3 w-3 text-white m-0.5" />
          </div>
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 border-red-600 hover:bg-red-600`}
            title={tooltipText}
          >
            <XCircle className="h-3 w-3 text-white m-0.5" />
          </div>
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 border-yellow-600 hover:bg-yellow-600`}
            title={tooltipText}
          >
            <Clock className="h-3 w-3 text-white m-0.5" />
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
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-[var(--foreground)]">{classDetails.name}</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)] ml-13">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(classDetails.date)}
                  </span>
                  <span>•</span>
                  <span>{classDetails.teacher}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5">
                <Users className="h-3.5 w-3.5" />
                {classDetails.totalStudents} students
              </Badge>
              <Badge 
                className={`flex items-center gap-1.5 px-3 py-1.5 ${
                  attendanceRate >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
                  attendanceRate >= 90 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  attendanceRate >= 85 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {attendanceRate}% attendance
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--foreground)]">{classDetails.present}</div>
                <div className="text-xs text-[var(--muted-foreground)]">students</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Present</div>
            <div className="w-full bg-[var(--muted)] rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${classDetails.totalStudents > 0 
                    ? Math.round((classDetails.present / classDetails.totalStudents) * 100) 
                    : 0}%` 
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--foreground)]">{classDetails.absent}</div>
                <div className="text-xs text-[var(--muted-foreground)]">students</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Absent</div>
            <div className="w-full bg-[var(--muted)] rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${classDetails.totalStudents > 0 
                    ? Math.round((classDetails.absent / classDetails.totalStudents) * 100) 
                    : 0}%` 
                }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--foreground)]">{classDetails.late}</div>
                <div className="text-xs text-[var(--muted-foreground)]">students</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--foreground)] mb-2">Late</div>
            <div className="w-full bg-[var(--muted)] rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${classDetails.totalStudents > 0 
                    ? Math.round((classDetails.late / classDetails.totalStudents) * 100) 
                    : 0}%` 
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Student Name</TableHead>
                    {showWeekBreakdown ? (
                      <>
                        {weekDays.map((day) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                          
                          return (
                            <TableHead 
                              key={day.date.toISOString()} 
                              className={`text-center min-w-[80px] ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wide">{day.shortDay}</span>
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {day.date.getDate()}/{day.date.getMonth() + 1}
                                </span>
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
                      const getDayStatus = (dayDate: Date) => {
                        if (!student.weeklyAttendance || student.weeklyAttendance.length === 0) {
                          return 'NOT_SCHEDULED'
                        }
                        const dateKey = dayDate.toISOString().split('T')[0]
                        const dayAttendance = student.weeklyAttendance.find(
                          (wa: any) => {
                            const waDate = typeof wa.date === 'string' 
                              ? wa.date 
                              : new Date(wa.date).toISOString().split('T')[0]
                            return waDate === dateKey
                          }
                        )
                        return dayAttendance?.status || 'NOT_SCHEDULED'
                      }
                      
                      return (
                        <TableRow 
                          key={student.id} 
                          className="hover:bg-[var(--muted)]/30 cursor-pointer transition-colors"
                          onClick={() => onStudentClick(student.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-[var(--foreground)]" />
                              </div>
                              <span className="font-medium text-[var(--foreground)]">{student.name}</span>
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
                              const today = new Date()
                              today.setHours(0, 0, 0, 0)
                              const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                              
                              return (
                                <TableCell 
                                  key={day.date.toISOString()} 
                                  className={`text-center ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
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
                          ) : (
                            <>
                              <TableCell className="hidden md:table-cell text-[var(--muted-foreground)]">
                                {student.time || '-'}
                              </TableCell>
                              <TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
