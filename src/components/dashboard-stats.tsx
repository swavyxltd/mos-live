import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { formatCurrency } from '@/lib/utils'
import { Users, GraduationCap, UserCheck, ClipboardList, CreditCard, AlertTriangle } from 'lucide-react'

interface DashboardStatsProps {
  totalStudents: number
  activeClasses: number
  staffCount: number
  todayAttendance: number
  monthlyFees: number
  overdueInvoices: number
}

export function DashboardStats({
  totalStudents,
  activeClasses,
  staffCount,
  todayAttendance,
  monthlyFees,
  overdueInvoices
}: DashboardStatsProps) {
  const stats = [
    {
      name: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Classes',
      value: activeClasses,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Staff Members',
      value: staffCount,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: "Today's Attendance",
      value: `${todayAttendance}%`,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      name: 'Fees Collected (This Month)',
      value: formatCurrency(monthlyFees),
      icon: CreditCard,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      name: 'Overdue Invoices',
      value: overdueInvoices,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
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
