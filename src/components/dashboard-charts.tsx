'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DashboardChartsProps {
  attendanceTrend: Array<{
    week: string
    percentage: number
  }>
  invoiceTrend: Array<{
    week: string
    amount: number
  }>
}

export function DashboardCharts({ attendanceTrend, invoiceTrend }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Attendance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trend (8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                  labelFormatter={(label) => `Week: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend (8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `Week: ${label}`}
                />
                <Bar dataKey="amount" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
