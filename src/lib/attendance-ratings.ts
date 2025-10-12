import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface AttendanceRating {
  icon: typeof TrendingUp | typeof TrendingDown | typeof Minus
  color: string
  text: string
  bgColor: string
  borderColor: string
}

/**
 * Standardized attendance rating logic used across the entire app
 * 95%+ = Excellent (Green)
 * 86-94% = Good (Yellow) 
 * 85% and below = Needs Improvement (Red)
 */
export function getAttendanceRating(attendance: number): AttendanceRating {
  if (attendance >= 95) {
    return {
      icon: TrendingUp,
      color: 'text-green-600',
      text: 'Excellent',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  }
  
  if (attendance >= 86) {
    return {
      icon: Minus,
      color: 'text-yellow-600',
      text: 'Good',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  }
  
  return {
    icon: TrendingDown,
    color: 'text-red-600',
    text: 'Needs Improvement',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
}

/**
 * Get attendance trend for student detail modals and other components
 * Returns 'up', 'down', or 'stable' based on attendance percentage
 */
export function getAttendanceTrend(attendance: number): 'up' | 'down' | 'stable' {
  if (attendance >= 95) return 'up'
  if (attendance < 86) return 'down'
  return 'stable'
}

/**
 * Get attendance status color classes for badges and UI elements
 */
export function getAttendanceStatusColor(attendance: number): {
  text: string
  bg: string
  border: string
} {
  if (attendance >= 95) {
    return {
      text: 'text-green-800',
      bg: 'bg-green-100',
      border: 'border-green-200'
    }
  }
  
  if (attendance >= 86) {
    return {
      text: 'text-yellow-800',
      bg: 'bg-yellow-100',
      border: 'border-yellow-200'
    }
  }
  
  return {
    text: 'text-red-800',
    bg: 'bg-red-100',
    border: 'border-red-200'
  }
}
