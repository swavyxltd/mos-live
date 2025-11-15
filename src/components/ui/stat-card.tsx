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
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, description, detail, icon, className, onClick, ...props }, ref) => {
    const changeColor = {
      positive: 'text-green-600 bg-green-50',
      negative: 'text-red-600 bg-red-50',
      neutral: 'text-gray-600 bg-gray-50'
    }

    // Split title in the middle for mobile (2 lines) - ALWAYS split
    const splitTitle = (text: string): { firstLine: string; secondLine: string } => {
      const words = text.split(' ')
      if (words.length <= 1) {
        // If only one word, split it in the middle
        const midPoint = Math.ceil(text.length / 2)
        return { firstLine: text.slice(0, midPoint), secondLine: text.slice(midPoint) }
      }
      const midPoint = Math.ceil(words.length / 2)
      const firstLine = words.slice(0, midPoint).join(' ')
      const secondLine = words.slice(midPoint).join(' ')
      return { firstLine, secondLine }
    }

    const titleParts = splitTitle(title)

    return (
      <Card 
        ref={ref} 
        className={cn(
          "relative h-32 sm:h-36 min-h-32 sm:min-h-36 transition-all duration-200",
          onClick ? "hover:shadow-md hover:scale-[1.02] cursor-pointer" : "",
          className
        )} 
        onClick={onClick}
        {...props}
      >
        <CardContent className="!p-3 sm:!p-4 h-full flex flex-col justify-center">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              {/* Mobile: ALWAYS 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <p className="text-xs text-[var(--muted-foreground)] leading-tight">{titleParts.firstLine}</p>
                <p className="text-xs text-[var(--muted-foreground)] leading-tight">{titleParts.secondLine || '\u00A0'}</p>
              </div>
              <p className="hidden md:block text-xs sm:text-sm text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
              <p className="text-2xl sm:text-3xl font-semibold text-[var(--foreground)] whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
              {description && (
                <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">{description}</p>
              )}
              {detail && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">{detail}</p>
                  {change && (
                    <div className={cn(
                      "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium flex-shrink-0",
                      changeColor[change.type]
                    )}>
                      {change.value}
                    </div>
                  )}
                </div>
              )}
              {!detail && change && (
                <div className="flex justify-end">
                  <div className={cn(
                    "px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-xs font-medium flex-shrink-0",
                    changeColor[change.type]
                  )}>
                    {change.value}
                  </div>
                </div>
              )}
            </div>
            {icon && (
              <div className="text-[var(--muted-foreground)] flex-shrink-0">
                {icon}
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
