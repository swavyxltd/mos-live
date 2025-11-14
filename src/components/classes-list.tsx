import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Users, Clock, Calendar, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

interface Class {
  id: string
  name: string
  description: string | null
  schedule: any
  createdAt: Date
  User: {
    name: string | null
    email: string | null
  } | null
  StudentClass: Array<{
    Student: {
      firstName: string
      lastName: string
    }
  }>
  _count: {
    StudentClass: number
  }
}

interface ClassesListProps {
  classes: Class[]
}

export function ClassesList({ classes }: ClassesListProps) {
  if (classes.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first class.</p>
          <Link href="/classes/new">
            <Button>Create Class</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {classes.map((cls) => {
        const schedule = cls.schedule as any
        const days = schedule?.days || []
        const startTime = schedule?.startTime || 'TBD'
        const endTime = schedule?.endTime || 'TBD'
        
        return (
          <Card key={cls.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  {cls.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {cls.description}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Teacher */}
              {cls.User && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{cls.User.name || cls.User.email}</span>
                </div>
              )}
              
              {/* Schedule */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{days.join(', ')}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{startTime} - {endTime}</span>
                </div>
              </div>
              
              {/* Student count and Monthly Fee */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{cls._count.StudentClass} students</span>
                </div>
                <div className="flex items-center gap-2">
                  {(cls as any).monthlyFeeP && (
                    <span className="text-sm font-medium text-gray-900">
                      £{((cls as any).monthlyFeeP / 100).toFixed(2)}/month
                    </span>
                  )}
                  <Badge variant="secondary">
                    {cls._count.StudentClass > 0 ? 'Active' : 'Empty'}
                  </Badge>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Link href={`/classes/${cls.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
                <Link href={`/classes/${cls.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
