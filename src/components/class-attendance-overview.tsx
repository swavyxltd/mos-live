'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight,
  Calendar,
  ArrowRight
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
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-16 w-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Attendance Data</h3>
          <p className="text-[var(--muted-foreground)]">
            No attendance records available for the selected period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {classes.map((classItem) => {
        const attendanceRate = classItem.totalStudents > 0
          ? Math.round(((classItem.present + classItem.late) / classItem.totalStudents) * 100)
          : 0
        
        const getAttendanceColor = (rate: number) => {
          if (rate >= 95) return 'text-green-600 bg-green-50 border-green-200'
          if (rate >= 90) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
          if (rate >= 85) return 'text-orange-600 bg-orange-50 border-orange-200'
          return 'text-red-600 bg-red-50 border-red-200'
        }

        const getAttendanceBackground = (rate: number) => {
          if (rate >= 95) return 'bg-green-50'
          if (rate >= 90) return 'bg-yellow-50'
          if (rate >= 85) return 'bg-orange-50'
          return 'bg-red-50'
        }

        return (
          <Card 
            key={classItem.id} 
            className="group hover:shadow-md transition-all cursor-pointer"
            onClick={() => onClassClick(classItem.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-[var(--foreground)]" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-[var(--foreground)] truncate">
                      {classItem.name}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)] ml-13">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(classItem.date)}
                    </span>
                    <span>•</span>
                    <span>{classItem.teacher}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 ml-2 group-hover:text-[var(--foreground)] group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Attendance Rate */}
              <div className={`rounded-lg p-4 ${getAttendanceBackground(attendanceRate)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">Attendance Rate</span>
                  <Badge className={getAttendanceColor(attendanceRate)}>
                    {attendanceRate}%
                  </Badge>
                </div>
                <div className="w-full bg-[var(--card)] rounded-full h-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      attendanceRate >= 95 ? 'bg-green-500' :
                      attendanceRate >= 90 ? 'bg-yellow-500' :
                      attendanceRate >= 85 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-700" />
                    </div>
                    <span className="text-xs font-medium text-green-700">Present</span>
                  </div>
                  <div className="text-xl font-bold text-green-900">{classItem.present}</div>
                  <div className="text-xs text-green-600 mt-1">
                    {classItem.totalStudents > 0 
                      ? Math.round((classItem.present / classItem.totalStudents) * 100) 
                      : 0}%
                  </div>
                </div>
                
                <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <XCircle className="h-4 w-4 text-red-700" />
                    </div>
                    <span className="text-xs font-medium text-red-700">Absent</span>
                  </div>
                  <div className="text-xl font-bold text-red-900">{classItem.absent}</div>
                  <div className="text-xs text-red-600 mt-1">
                    {classItem.totalStudents > 0 
                      ? Math.round((classItem.absent / classItem.totalStudents) * 100) 
                      : 0}%
                  </div>
                </div>
                
                <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-yellow-700" />
                    </div>
                    <span className="text-xs font-medium text-yellow-700">Late</span>
                  </div>
                  <div className="text-xl font-bold text-yellow-900">{classItem.late}</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {classItem.totalStudents > 0 
                      ? Math.round((classItem.late / classItem.totalStudents) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{classItem.totalStudents} {classItem.totalStudents === 1 ? 'student' : 'students'}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[var(--foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClassClick(classItem.id)
                  }}
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
