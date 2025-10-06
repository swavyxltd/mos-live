import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Building2, Users, CreditCard, AlertTriangle } from 'lucide-react'

interface OwnerOverviewStatsProps {
  totalOrgs: number
  totalStudents: number
  totalRevenue: number
  overdueCount: number
}

export function OwnerOverviewStats({
  totalOrgs,
  totalStudents,
  totalRevenue,
  overdueCount
}: OwnerOverviewStatsProps) {
  const stats = [
    {
      name: 'Total Organizations',
      value: totalOrgs,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Revenue (30 days)',
      value: formatCurrency(totalRevenue),
      icon: CreditCard,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      name: 'Overdue Invoices',
      value: overdueCount,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.name}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
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
