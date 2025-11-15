'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChevronRight,
  Calendar,
  User
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
  name: string
  teacher: string
  date: Date | string
  totalStudents: number
  present: number
  absent: number
  late: number
  students: Student[]
}

interface ClassAttendanceOverviewProps {
  classes: ClassAttendance[]
  onClassClick: (classId: string) => void
  onStudentClick: (studentId: string) => void
}

export function ClassAttendanceOverview({ 
  classes, 
  onClassClick, 
  onStudentClick 
}: ClassAttendanceOverviewProps) {
  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No attendance data available for this week.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {classes.map((classItem) => (
        <Card 
          key={classItem.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onClassClick(classItem.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                  {classItem.name}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(classItem.date)} • {classItem.teacher}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Basic Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-lg font-semibold text-green-700">
                  {classItem.present}
                </div>
                <div className="text-xs text-green-600">Present</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-lg font-semibold text-red-700">
                  {classItem.absent}
                </div>
                <div className="text-xs text-red-600">Absent</div>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="text-lg font-semibold text-yellow-700">
                  {classItem.late}
                </div>
                <div className="text-xs text-yellow-600">Late</div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{classItem.totalStudents} students</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(((classItem.present + classItem.late) / classItem.totalStudents) * 100)}% attendance
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
