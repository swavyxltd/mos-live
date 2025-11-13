import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Users, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react'

interface Student {
  id: string
  firstName: string
  lastName: string
  studentClasses: Array<{
    class: {
      name: string
    }
  }>
}

interface ParentDashboardStatsProps {
  students: Student[]
}

export function ParentDashboardStats({ students }: ParentDashboardStatsProps) {
  const totalStudents = students.length
  const totalClasses = students.reduce((acc, student) => acc + student.studentClasses.length, 0)
  
  const stats = [
    {
      name: 'Your Children',
      value: totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Enrolled Classes',
      value: totalClasses,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Active Students',
      value: totalStudents, // All students are considered active for now
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      name: 'Pending Invoices',
      value: 0, // This would be calculated from actual invoice data
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {stats.map((stat) => (
        <Card key={stat.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title={stat.name} />
            <div className={`p-2 rounded-full ${stat.bgColor} flex-shrink-0`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
