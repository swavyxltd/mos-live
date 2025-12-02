import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { Calendar, Clock, Users } from 'lucide-react'

interface Class {
  id: string
  name: string
  schedule: any
  studentClasses: Array<{
    student: {
      firstName: string
      lastName: string
    }
  }>
}

interface UpcomingClassesProps {
  classes: Class[]
}

export function UpcomingClasses({ classes }: UpcomingClassesProps) {
  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No upcoming classes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get next 7 days
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return date
  })

  const upcomingClasses = next7Days
    .map(date => {
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
      
      return classes
        .filter(cls => {
          // Parse schedule from JSON string if needed
          let schedule: any = {}
          if (cls.schedule) {
            try {
              schedule = typeof cls.schedule === 'string' 
                ? JSON.parse(cls.schedule) 
                : cls.schedule
            } catch (e) {
              schedule = {}
            }
          }
          // Normalize day names (Monday vs monday)
          const scheduleDays = schedule?.days || []
          const normalizedScheduleDays = scheduleDays.map((d: string) => d.toLowerCase())
          return normalizedScheduleDays.includes(dayOfWeek)
        })
        .map(cls => ({
          ...cls,
          date,
          dayOfWeek
        }))
    })
    .flat()
    .slice(0, 5) // Show max 5 upcoming classes

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Classes</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          {upcomingClasses.map((cls, index) => {
            // Parse schedule from JSON string if needed
            let schedule: any = {}
            if (cls.schedule) {
              try {
                schedule = typeof cls.schedule === 'string' 
                  ? JSON.parse(cls.schedule) 
                  : cls.schedule
              } catch (e) {
                schedule = {}
              }
            }
            const startTime = schedule?.startTime || 'TBD'
            const endTime = schedule?.endTime || 'TBD'
            
            return (
              <div key={`${cls.id}-${cls.date.getTime()}`}>
                <div className="flex items-center space-x-4 py-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {cls.name}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {startTime} - {endTime}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {cls.studentClasses.length} child{cls.studentClasses.length !== 1 ? 'ren' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {formatDate(cls.date)}
                </div>
                </div>
                {index < upcomingClasses.length - 1 && (
                  <div className="border-b border-[var(--border)]" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
