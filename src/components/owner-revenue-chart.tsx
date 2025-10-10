'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueData {
  month: string
  revenue: number
}

interface OwnerRevenueChartProps {
  data: RevenueData[]
}

export function OwnerRevenueChart({ data }: OwnerRevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
