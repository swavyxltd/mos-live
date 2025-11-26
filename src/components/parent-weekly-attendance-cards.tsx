'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, User } from 'lucide-react'
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
    const baseClasses = "w-5 h-5 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer shadow-sm"
    const tooltipText = status === 'LATE' && time 
      ? `${day}: ${status} (arrived at ${time})`
      : `${day}: ${status}`
    
    switch (status) {
      case 'PRESENT':
        return (
          <div 
            className={`${baseClasses} bg-green-500 hover:bg-green-600 shadow-green-500/30`}
            title={tooltipText}
          />
        )
      case 'ABSENT':
        return (
          <div 
            className={`${baseClasses} bg-red-500 hover:bg-red-600 shadow-red-500/30`}
            title={tooltipText}
          />
        )
      case 'LATE':
        return (
          <div 
            className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30`}
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
          <Calendar className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No Attendance Data</h3>
          <p className="text-[var(--muted-foreground)]">
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
          <Card key={child.id} className="hover:shadow-lg transition-all border-[var(--border)]">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-[var(--foreground)]">
                      {child.name}
                    </CardTitle>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {child.class} • {child.teacher}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[var(--foreground)]">
                      {weeklyAttendance}%
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">This Week</div>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)]">
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
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">Weekly Breakdown</h3>
                  <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3 w-3" />
                    {formatDateRange(new Date())}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-5 gap-3">
                  {child.weeklyAttendance.map((day, index) => (
                    <div 
                      key={index} 
                      className="flex flex-col items-center gap-3 p-4 bg-[var(--accent)]/30 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--accent)]/50 hover:border-[var(--primary)]/30 transition-all group"
                    >
                      <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                        {day.day}
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        {getStatusDot(day.status, day.day, day.time)}
                        <div className="text-xs text-[var(--muted-foreground)] text-center font-medium">
                          {day.status === 'PRESENT' || day.status === 'LATE' 
                            ? day.time 
                            : day.status === 'ABSENT' 
                            ? 'Absent' 
                            : day.status === 'NOT_SCHEDULED'
                            ? 'N/A'
                            : day.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      <div className="flex justify-center pt-2">
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
