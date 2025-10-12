import { StaffSubrole, hasStaffPermission, canPerformAction } from '@/types/staff-roles'

// Extended user session type with staff subrole
export interface StaffUser {
  id: string
  email: string
  name: string
  isSuperAdmin: boolean
  staffSubrole?: StaffSubrole
}

// Permission checking functions for staff portal
export class StaffPermissionChecker {
  private user: StaffUser
  private subrole: StaffSubrole

  constructor(user: StaffUser, subrole: StaffSubrole) {
    this.user = user
    this.subrole = subrole
  }

  // Check if user has a specific permission
  hasPermission(permission: string): boolean {
    // SuperAdmin always has all permissions
    if (this.user?.isSuperAdmin) {
      return true
    }

    return hasStaffPermission(this.subrole, permission as any)
  }

  // Check if user can perform a specific action
  canPerform(action: string): boolean {
    // SuperAdmin can perform all actions
    if (this.user.isSuperAdmin) {
      return true
    }

    return canPerformAction(this.subrole, action)
  }

  // Check if user can access a specific route/page
  canAccessRoute(route: string): boolean {
    // SuperAdmin can access all routes
    if (this.user.isSuperAdmin) {
      return true
    }

    // Map routes to required permissions
    const routePermissions: Record<string, string[]> = {
      '/staff': ['view_all_data'],
      '/staff/classes': ['view_all_classes'],
      '/staff/students': ['view_all_data'],
      '/staff/attendance': ['mark_attendance'],
      '/staff/fees': ['manage_invoices'],
      '/staff/invoices': ['view_invoices'],
      '/staff/messages': ['send_messages'],
      '/staff/calendar': ['create_events'],
      '/staff/support': ['view_all_data'],
      '/staff/settings': ['access_settings'],
      '/staff/staff': ['manage_staff']
    }

    const requiredPermissions = routePermissions[route] || ['view_all_data']
    return requiredPermissions.every(permission => this.hasPermission(permission))
  }

  // Check if user can view a specific section
  canViewSection(section: string): boolean {
    const sectionPermissions: Record<string, string> = {
      'staff_management': 'manage_staff',
      'class_management': 'manage_classes',
      'student_management': 'manage_students',
      'attendance': 'mark_attendance',
      'fees': 'manage_invoices',
      'invoices': 'view_invoices',
      'payments': 'reconcile_payments',
      'reports': 'view_reports',
      'messages': 'send_messages',
      'calendar': 'create_events',
      'settings': 'access_settings'
    }

    const requiredPermission = sectionPermissions[section]
    return requiredPermission ? this.hasPermission(requiredPermission) : true
  }

  // Get user's subrole
  getSubrole(): StaffSubrole {
    return this.subrole
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.subrole === 'ADMIN'
  }

  // Check if user is teacher
  isTeacher(): boolean {
    return this.subrole === 'TEACHER'
  }

  // Check if user is finance officer
  isFinanceOfficer(): boolean {
    return this.subrole === 'FINANCE_OFFICER'
  }

}

// Helper function to create a permission checker
export function createStaffPermissionChecker(user: StaffUser, subrole: StaffSubrole): StaffPermissionChecker {
  return new StaffPermissionChecker(user, subrole)
}

// Helper function to check permissions in components
export function useStaffPermissions(user?: StaffUser, subrole?: StaffSubrole) {
  if (!user || !subrole) {
    return {
      hasPermission: () => false,
      canPerform: () => false,
      canAccessRoute: () => false,
      canViewSection: () => false,
      isAdmin: () => false,
      isTeacher: () => false,
      isFinanceOfficer: () => false,
      getSubrole: () => undefined
    }
  }
  
  const checker = createStaffPermissionChecker(user, subrole)
  
  return {
    hasPermission: (permission: string) => checker.hasPermission(permission),
    canPerform: (action: string) => checker.canPerform(action),
    canAccessRoute: (route: string) => checker.canAccessRoute(route),
    canViewSection: (section: string) => checker.canViewSection(section),
    isAdmin: () => checker.isAdmin(),
    isTeacher: () => checker.isTeacher(),
    isFinanceOfficer: () => checker.isFinanceOfficer(),
    getSubrole: () => checker.getSubrole()
  }
}
