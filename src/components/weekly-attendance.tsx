import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

interface AttendanceRecord {
  id: string
  date: Date
  status: 'PRESENT' | 'LATE' | 'ABSENT'
  student: {
    firstName: string
    lastName: string
  }
  class: {
    name: string
  }
}

interface WeeklyAttendanceProps {
  attendance: AttendanceRecord[]
}

const statusConfig = {
  PRESENT: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Present'
  },
  LATE: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Late'
  },
  ABSENT: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Absent'
  }
}

export function WeeklyAttendance({ attendance }: WeeklyAttendanceProps) {
  if (attendance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No attendance records for this week</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group attendance by student
  const attendanceByStudent = attendance.reduce((acc, record) => {
    const studentName = `${record.student.firstName} ${record.student.lastName}`
    if (!acc[studentName]) {
      acc[studentName] = []
    }
    acc[studentName].push(record)
    return acc
  }, {} as Record<string, AttendanceRecord[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(attendanceByStudent).map(([studentName, records]) => (
            <div key={studentName}>
              <h4 className="text-sm font-medium text-gray-900 mb-3">{studentName}</h4>
              <div className="space-y-2">
                {records.map((record) => {
                  const config = statusConfig[record.status]
                  const Icon = config.icon
                  
                  return (
                    <div key={record.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1 rounded-full ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {record.class.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(record.date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={config.bgColor}>
                        <span className={config.color}>{config.label}</span>
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
