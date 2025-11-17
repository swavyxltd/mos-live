import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, Calendar, User, ChevronRight } from 'lucide-react'
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {classes.map((cls) => {
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
        const days = schedule?.days || []
        const startTime = schedule?.startTime || 'TBD'
        const endTime = schedule?.endTime || 'TBD'
        
        // Format days more compactly
        const formatDays = (days: string[]) => {
          if (days.length === 0) return 'Not scheduled'
          if (days.length === 5 && days.includes('Monday') && days.includes('Friday')) {
            return 'Mon - Fri'
          }
          if (days.length <= 3) {
            return days.map(d => d.slice(0, 3)).join(', ')
          }
          return `${days.length} days/week`
        }
        
        return (
          <Link key={cls.id} href={`/classes/${cls.id}`}>
            <Card className="h-full hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      {cls.name}
                    </CardTitle>
                    {cls.description && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                        {cls.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Teacher */}
                {cls.User && (
                  <div className="flex items-center text-sm text-[var(--muted-foreground)]">
                    <User className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{cls.User.name || cls.User.email}</span>
                  </div>
                )}
                
                {/* Schedule - Compact */}
                <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                  <div className="flex items-center min-w-0">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{formatDays(days)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{startTime !== 'TBD' && endTime !== 'TBD' ? `${startTime} - ${endTime}` : 'TBD'}</span>
                  </div>
                </div>
                
                {/* Student count and Monthly Fee */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center text-sm text-[var(--muted-foreground)]">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{cls._count.StudentClass} {cls._count.StudentClass === 1 ? 'student' : 'students'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(cls as any).monthlyFeeP && (
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        £{((cls as any).monthlyFeeP / 100).toFixed(2)}/mo
                      </span>
                    )}
                    <Badge 
                      variant="outline"
                      className={cls._count.StudentClass > 0 
                        ? 'text-green-600 bg-green-50 border-0 dark:bg-green-950 dark:text-green-200' 
                        : 'bg-gray-50 text-gray-600 border-0 dark:bg-gray-800 dark:text-gray-200'}
                    >
                      {cls._count.StudentClass > 0 ? 'Active' : 'Empty'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
