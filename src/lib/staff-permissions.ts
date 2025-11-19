import { StaffSubrole, hasStaffPermission, canPerformAction, StaffPermissionKey, SIDEBAR_PAGE_PERMISSIONS, LEGACY_PERMISSION_MAP } from '@/types/staff-roles'
import { getStaffPermissionsFromDb, hasStaffPermissionInOrg } from './staff-permissions-db'

// Extended user session type with staff subrole
export interface StaffUser {
  id: string
  email: string
  name: string
  isSuperAdmin: boolean
  staffSubrole?: StaffSubrole
  orgId?: string
  permissions?: StaffPermissionKey[] // Cached permissions from database
}

// Permission checking functions for staff portal
export class StaffPermissionChecker {
  private user: StaffUser
  private subrole: StaffSubrole
  private permissions: StaffPermissionKey[] | null = null
  private orgId: string | null = null

  constructor(user: StaffUser, subrole: StaffSubrole, orgId?: string, permissions?: StaffPermissionKey[]) {
    this.user = user
    this.subrole = subrole
    this.orgId = orgId || user.orgId || null
    this.permissions = permissions || user.permissions || null
  }

  // Set permissions (for async loading)
  setPermissions(permissions: StaffPermissionKey[]) {
    this.permissions = permissions
  }

  // Get permissions (async if not already loaded)
  async getPermissions(): Promise<StaffPermissionKey[]> {
    if (this.permissions) {
      return this.permissions
    }

    if (this.orgId && this.user.id) {
      this.permissions = await getStaffPermissionsFromDb(this.user.id, this.orgId)
      return this.permissions
    }

    // Fallback to preset permissions
    const { getStaffPermissionKeys } = await import('@/types/staff-roles')
    this.permissions = getStaffPermissionKeys(this.subrole)
    return this.permissions
  }

  // Check if user has a specific permission (legacy)
  hasPermission(permission: string): boolean {
    // SuperAdmin always has all permissions
    if (this.user?.isSuperAdmin) {
      return true
    }

    // Map legacy permission to new permission keys
    const mappedPermissions = LEGACY_PERMISSION_MAP[permission] || []
    if (mappedPermissions.length === 0) {
      return hasStaffPermission(this.subrole, permission as any)
    }

    // Check if user has any of the mapped permissions
    if (this.permissions) {
      return mappedPermissions.some(key => this.permissions!.includes(key))
    }

    // Fallback to subrole-based check
    return hasStaffPermission(this.subrole, permission as any)
  }

  // Check if user has a specific permission key (new)
  async hasPermissionKey(permissionKey: StaffPermissionKey): Promise<boolean> {
    // SuperAdmin always has all permissions
    if (this.user?.isSuperAdmin) {
      return true
    }

    const permissions = await this.getPermissions()
    return permissions.includes(permissionKey)
  }

  // Synchronous version (requires permissions to be pre-loaded)
  hasPermissionKeySync(permissionKey: StaffPermissionKey): boolean {
    // SuperAdmin always has all permissions
    if (this.user?.isSuperAdmin) {
      return true
    }

    if (!this.permissions) {
      // Fallback to subrole check
      const { getStaffPermissionKeys } = require('@/types/staff-roles')
      const rolePermissions = getStaffPermissionKeys(this.subrole)
      return rolePermissions.includes(permissionKey)
    }

    return this.permissions.includes(permissionKey)
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
  async canAccessRoute(route: string): Promise<boolean> {
    // SuperAdmin can access all routes
    if (this.user.isSuperAdmin) {
      return true
    }

    // Normalize route (remove /staff prefix if present)
    const normalizedRoute = route.replace(/^\/staff/, '') || '/dashboard'
    
    // Map route to permission key
    const permissionKey = SIDEBAR_PAGE_PERMISSIONS[normalizedRoute]
    if (permissionKey) {
      return this.hasPermissionKeySync(permissionKey)
    }

    // Fallback to legacy route mapping
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

  // Synchronous version (requires permissions to be pre-loaded)
  canAccessRouteSync(route: string): boolean {
    // SuperAdmin can access all routes
    if (this.user.isSuperAdmin) {
      return true
    }

    // Normalize route
    const normalizedRoute = route.replace(/^\/staff/, '') || '/dashboard'
    
    // Map route to permission key
    const permissionKey = SIDEBAR_PAGE_PERMISSIONS[normalizedRoute]
    if (permissionKey) {
      return this.hasPermissionKeySync(permissionKey)
    }

    // Fallback to legacy
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

  // Get all permissions (sync version)
  getPermissionsSync(): StaffPermissionKey[] {
    if (this.permissions) {
      return this.permissions
    }
    
    // Fallback to preset
    const { getStaffPermissionKeys } = require('@/types/staff-roles')
    return getStaffPermissionKeys(this.subrole)
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
export function createStaffPermissionChecker(
  user: StaffUser, 
  subrole: StaffSubrole, 
  orgId?: string,
  permissions?: StaffPermissionKey[]
): StaffPermissionChecker {
  return new StaffPermissionChecker(user, subrole, orgId, permissions)
}

// Helper function to check permissions in components
export function useStaffPermissions(
  user?: StaffUser, 
  subrole?: StaffSubrole, 
  orgId?: string,
  permissions?: StaffPermissionKey[]
) {
  if (!user || !subrole) {
    return {
      hasPermission: () => false,
      canPerform: () => false,
      canAccessRoute: () => false,
      canAccessRouteSync: () => false,
      canViewSection: () => false,
      hasPermissionKey: async () => false,
      hasPermissionKeySync: () => false,
      isAdmin: () => false,
      isTeacher: () => false,
      isFinanceOfficer: () => false,
      getSubrole: () => undefined,
      getPermissions: async () => [],
      getPermissionsSync: () => []
    }
  }
  
  const checker = createStaffPermissionChecker(user, subrole, orgId, permissions)
  
  return {
    hasPermission: (permission: string) => checker.hasPermission(permission),
    canPerform: (action: string) => checker.canPerform(action),
    canAccessRoute: async (route: string) => checker.canAccessRoute(route),
    canAccessRouteSync: (route: string) => checker.canAccessRouteSync(route),
    canViewSection: (section: string) => checker.canViewSection(section),
    hasPermissionKey: async (key: StaffPermissionKey) => checker.hasPermissionKey(key),
    hasPermissionKeySync: (key: StaffPermissionKey) => checker.hasPermissionKeySync(key),
    isAdmin: () => checker.isAdmin(),
    isTeacher: () => checker.isTeacher(),
    isFinanceOfficer: () => checker.isFinanceOfficer(),
    getSubrole: () => checker.getSubrole(),
    getPermissions: async () => checker.getPermissions(),
    getPermissionsSync: () => checker.getPermissionsSync()
  }
}
