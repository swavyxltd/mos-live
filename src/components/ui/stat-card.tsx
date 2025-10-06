import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
  description?: string
  detail?: string
  className?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, description, detail, className, ...props }, ref) => {
    const changeColor = {
      positive: 'text-green-600 bg-green-50',
      negative: 'text-red-600 bg-red-50',
      neutral: 'text-gray-600 bg-gray-50'
    }

    return (
      <Card ref={ref} className={cn("relative", className)} {...props}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
              <p className="text-4xl font-semibold text-[var(--foreground)]">{value}</p>
              {description && (
                <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
              )}
              {detail && (
                <p className="text-xs text-[var(--muted-foreground)]">{detail}</p>
              )}
            </div>
            {change && (
              <div className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                changeColor[change.type]
              )}>
                {change.value}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard }
