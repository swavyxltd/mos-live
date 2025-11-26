'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getAttendanceRating } from '@/lib/attendance-ratings'
import Link from 'next/link'

interface AttendanceDay {
  day: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
  time?: string
}

interface ChildAttendance {
  id: string
  name: string
  class: string
  teacher: string
  overallAttendance: number
  weeklyAttendance: AttendanceDay[]
}

interface ParentWeeklyAttendanceCardsProps {
  attendanceData: ChildAttendance[]
}

export function ParentWeeklyAttendanceCards({ attendanceData }: ParentWeeklyAttendanceCardsProps) {
  const getStatusDot = (status: string, day: string, time?: string) => {
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
            title={tooltipText}
          />
        )
      default:
        return (
          <div 
            className={`${baseClasses} bg-gray-300 hover:bg-gray-400`}
            title={tooltipText}
          />
        )
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

  const formatDateRange = (date: Date) => {
    const weekStart = getWeekStart(date)
    const weekEnd = getWeekEnd(date)
    return `${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const calculateWeeklyAttendance = (child: ChildAttendance) => {
    const totalDays = child.weeklyAttendance.length
    if (totalDays === 0) return 0
    
    const presentDays = child.weeklyAttendance.filter(day => day.status === 'PRESENT' || day.status === 'LATE').length
    return Math.round((presentDays / totalDays) * 100)
  }

  if (attendanceData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
          <p className="text-gray-500">
            No attendance records found for this week.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {attendanceData.map((child) => {
        const weeklyAttendance = calculateWeeklyAttendance(child)
        const rating = getAttendanceRating(weeklyAttendance)
        const TrendIcon = rating.icon
        
        return (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {child.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {child.class} • {child.teacher}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {weeklyAttendance}%
                    </div>
                    <div className="text-sm text-gray-500">This Week</div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${rating.color}`} />
                    <span className={`text-sm font-medium ${rating.color}`}>
                      {rating.text}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange(new Date())}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {child.weeklyAttendance.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">{day.day}</div>
                      {getStatusDot(day.status, day.day, day.time)}
                      <div className="text-sm text-gray-500 text-center">
                        {day.status === 'PRESENT' || day.status === 'LATE' ? day.time : day.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      <div className="flex justify-center pt-4">
        <Link href="/parent/attendance">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            View More Attendance
          </Button>
        </Link>
      </div>
    </div>
  )
}
