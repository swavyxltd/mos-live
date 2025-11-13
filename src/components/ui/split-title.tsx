import * as React from "react"
import { CardTitle } from "./card"

interface SplitTitleProps {
  title: string
  className?: string
}

// Helper function to split title in the middle
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

export function SplitTitle({ title, className = "text-sm font-medium text-gray-600" }: SplitTitleProps) {
  const titleParts = splitTitle(title)

  return (
    <div className="flex-1 min-w-0">
      {/* Mobile: ALWAYS 2 lines, Desktop: 1 line */}
      <div className="md:hidden">
        <CardTitle className={`${className} leading-tight`}>{titleParts.firstLine}</CardTitle>
        <CardTitle className={`${className} leading-tight`}>{titleParts.secondLine || '\u00A0'}</CardTitle>
      </div>
      <CardTitle className={`hidden md:block ${className}`}>{title}</CardTitle>
    </div>
  )
}

