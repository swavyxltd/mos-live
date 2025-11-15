'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft,
  User,
  Calendar,
  Users
} from 'lucide-react'

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

interface ClassDetails {
  id: string
  name: string
  teacher: string
  date: Date
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
}

export function DetailedClassAttendance({ 
  classDetails, 
  onBack, 
  onStudentClick 
}: DetailedClassAttendanceProps) {
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
              {classDetails.date.toLocaleDateString()} • {classDetails.teacher}
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
            {Math.round(((classDetails.present + classDetails.late) / classDetails.totalStudents) * 100)}% attendance
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{classDetails.present}</div>
                <div className="text-sm text-green-600">Present</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-700">{classDetails.absent}</div>
                <div className="text-sm text-red-600">Absent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-700">{classDetails.late}</div>
                <div className="text-sm text-yellow-600">Late</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...classDetails.students]
              .sort((a, b) => {
                // Extract lastName and firstName from name (format: "FirstName LastName")
                const aParts = a.name.split(' ')
                const bParts = b.name.split(' ')
                const aLastName = aParts.length > 1 ? aParts[aParts.length - 1] : ''
                const bLastName = bParts.length > 1 ? bParts[bParts.length - 1] : ''
                const aFirstName = aParts[0] || ''
                const bFirstName = bParts[0] || ''
                
                const lastNameCompare = aLastName.localeCompare(bLastName, undefined, { sensitivity: 'base' })
                if (lastNameCompare !== 0) return lastNameCompare
                return aFirstName.localeCompare(bFirstName, undefined, { sensitivity: 'base' })
              })
              .map((student) => (
              <div 
                key={student.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(student.status)}
                  </div>
                  
                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onStudentClick(student.id)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {student.name}
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Weekly Attendance Dots */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0 mr-4">
                  {student.weeklyAttendance.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <div className="text-xs text-gray-500 font-medium">{day.day}</div>
                      {getWeeklyStatusIcon(day.status, day.day, day.time)}
                    </div>
                  ))}
                </div>
                
                {/* Attendance Percentage */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {student.attendancePercentage}%
                    </div>
                    <div className="text-xs text-gray-500">attendance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
