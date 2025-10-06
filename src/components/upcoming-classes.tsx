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
          const schedule = cls.schedule as any
          return schedule?.days?.includes(dayOfWeek)
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
        <div className="space-y-4">
          {upcomingClasses.map((cls, index) => {
            const schedule = cls.schedule as any
            const startTime = schedule?.startTime || 'TBD'
            const endTime = schedule?.endTime || 'TBD'
            
            return (
              <div key={`${cls.id}-${cls.date.getTime()}`} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {cls.name}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
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
                <div className="flex-shrink-0 text-xs text-gray-500">
                  {formatDate(cls.date)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
