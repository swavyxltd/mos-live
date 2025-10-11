import { StaffSubrole, STAFF_ROLE_DISPLAY_NAMES } from '@/types/staff-roles'
import { Badge } from '@/components/ui/badge'

interface StaffSubroleBadgeProps {
  subrole: StaffSubrole
  className?: string
}

export function StaffSubroleBadge({ subrole, className }: StaffSubroleBadgeProps) {
  const getVariant = (subrole: StaffSubrole) => {
    switch (subrole) {
      case 'ADMIN':
        return 'default' // Blue
      case 'TEACHER':
        return 'secondary' // Gray
      case 'FINANCE_OFFICER':
        return 'outline' // Green
      default:
        return 'secondary'
    }
  }

  return (
    <Badge variant={getVariant(subrole)} className={className}>
      {STAFF_ROLE_DISPLAY_NAMES[subrole]}
    </Badge>
  )
}
