'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueData {
  month: string
  revenue: number
  growth?: number
}

interface AnalyticsRevenueChartProps {
  data: RevenueData[]
}

export function AnalyticsRevenueChart({ data }: AnalyticsRevenueChartProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold">Revenue Trend Analysis</CardTitle>
        <CardDescription className="text-sm">Monthly recurring revenue and growth patterns</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="analyticsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E5E7EB" 
                strokeOpacity={0.6}
                vertical={false}
              />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickMargin={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickMargin={10}
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
                        <p className="text-sm text-gray-600">
                          Revenue: <span className="font-semibold text-blue-600">{formatCurrency(payload[0].value as number)}</span>
                        </p>
                        {data.growth && (
                          <p className="text-sm text-gray-600">
                            Growth: <span className={`font-semibold ${data.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.growth > 0 ? '+' : ''}{data.growth}%
                            </span>
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#analyticsRevenueGradient)"
                dot={{ fill: '#3B82F6', strokeWidth: 3, r: 5 }}
                activeDot={{ 
                  r: 7, 
                  stroke: '#3B82F6', 
                  strokeWidth: 2, 
                  fill: '#FFFFFF',
                  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
