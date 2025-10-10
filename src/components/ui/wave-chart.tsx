'use client'

import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'

interface WaveChartProps {
  title: string
  subtitle?: string
  data: Array<{ date: string; value: number }>
  className?: string
  filterOptions?: Array<{ label: string; value: string; active?: boolean }>
  onFilterChange?: (value: string) => void
}

export function WaveChart({ 
  title, 
  subtitle, 
  data, 
  className, 
  filterOptions = [
    { label: 'Last 3 months', value: '3m', active: true },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 7 days', value: '7d' }
  ],
  onFilterChange 
}: WaveChartProps) {
  const [activeFilter, setActiveFilter] = React.useState(
    filterOptions.find(f => f.active)?.value || filterOptions[0]?.value
  )

  const handleFilterChange = (value: string) => {
    setActiveFilter(value)
    onFilterChange?.(value)
  }

  // Filter data based on selected filter
  const getFilteredData = () => {
    const now = new Date()
    
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date)
      const daysDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (activeFilter) {
        case '7d':
          return daysDiff <= 7
        case '30d':
          return daysDiff <= 30
        case '90d':
          return daysDiff <= 90
        default:
          return true
      }
    })
    
    return filteredData
  }

  const filteredData = getFilteredData()

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={activeFilter === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => handleFilterChange(option.value)}
                className={cn(
                  "h-8 px-3 text-xs transition-all duration-200",
                  activeFilter === option.value
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--foreground)'
                }}
                formatter={(value: any) => [`${value}%`, 'Attendance']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
