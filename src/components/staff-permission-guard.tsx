'use client'

import { ReactNode } from 'react'
import { StaffSubrole } from '@/types/staff-roles'
import { useStaffPermissions } from '@/lib/staff-permissions'

interface StaffPermissionGuardProps {
  children: ReactNode
  permission?: string
  action?: string
  section?: string
  fallback?: ReactNode
  user: {
    id: string
    email: string
    name: string
    isSuperAdmin: boolean
  }
  subrole: StaffSubrole
}

export function StaffPermissionGuard({
  children,
  permission,
  action,
  section,
  fallback = null,
  user,
  subrole
}: StaffPermissionGuardProps) {
  const { hasPermission, canPerform, canViewSection } = useStaffPermissions(user, subrole)

  // Check permission based on the provided criteria
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (action) {
    hasAccess = canPerform(action)
  } else if (section) {
    hasAccess = canViewSection(section)
  } else {
    // If no specific permission is provided, allow access
    hasAccess = true
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Higher-order component for permission-based rendering
export function withStaffPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission?: string,
  action?: string,
  section?: string,
  fallback?: ReactNode
) {
  return function PermissionWrappedComponent(props: P & {
    user: {
      id: string
      email: string
      name: string
      isSuperAdmin: boolean
    }
    subrole: StaffSubrole
  }) {
    const { user, subrole, ...componentProps } = props

    return (
      <StaffPermissionGuard
        user={user}
        subrole={subrole}
        permission={permission}
        action={action}
        section={section}
        fallback={fallback}
      >
        <Component {...(componentProps as P)} />
      </StaffPermissionGuard>
    )
  }
}
