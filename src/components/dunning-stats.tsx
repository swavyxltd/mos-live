import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CreditCard, RotateCcw } from 'lucide-react'

interface DunningStatsProps {
  totalFailures: number
  totalAmount: number
  avgRetryCount: number
}

export function DunningStats({
  totalFailures,
  totalAmount,
  avgRetryCount
}: DunningStatsProps) {
  const stats = [
    {
      name: 'Active Failures',
      value: totalFailures,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Total Amount at Risk',
      value: formatCurrency(totalAmount),
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      name: 'Avg Retry Count',
      value: avgRetryCount.toFixed(1),
      icon: RotateCcw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
