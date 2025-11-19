// Staff subrole types within the staff portal
export type StaffSubrole = 'ADMIN' | 'TEACHER' | 'FINANCE_OFFICER'

// Permission keys that map to sidebar pages and actions
// These correspond to StaffPermission.key in the database
export type StaffPermissionKey = 
  // Page-level permissions (sidebar pages)
  | 'access_dashboard'
  | 'access_classes'
  | 'access_students'
  | 'access_applications'
  | 'access_staff'
  | 'access_attendance'
  | 'access_finances'
  | 'access_fees'
  | 'access_payments'
  | 'access_messages'
  | 'access_calendar'
  | 'access_support'
  | 'access_settings'

// Legacy permission types (kept for backward compatibility)
// These are now mapped to the new permission keys
export type StaffPermission = 
  // Admin permissions
  | 'manage_staff'
  | 'manage_classes'
  | 'manage_students'
  | 'manage_payments'
  | 'assign_roles'
  | 'view_reports'
  | 'view_invoices'
  | 'view_applications'
  | 'send_messages'
  | 'send_announcements'
  | 'create_events'
  | 'access_settings'
  // Teacher permissions
  | 'view_all_classes'
  | 'mark_attendance'
  | 'update_student_info'
  | 'create_class_events'
  | 'send_class_messages'
  // Finance Officer permissions
  | 'view_students_billing'
  | 'manage_invoices'
  | 'reconcile_payments'
  | 'mark_cash_payments'
  | 'generate_financial_reports'
  // General permissions
  | 'view_all_data'
  | 'view_calendar'

// Map sidebar pages to permission keys
export const SIDEBAR_PAGE_PERMISSIONS: Record<string, StaffPermissionKey> = {
  '/dashboard': 'access_dashboard',
  '/classes': 'access_classes',
  '/students': 'access_students',
  '/applications': 'access_applications',
  '/staff': 'access_staff',
  '/attendance': 'access_attendance',
  '/finances': 'access_finances',
  '/fees': 'access_fees',
  '/payments': 'access_payments',
  '/messages': 'access_messages',
  '/calendar': 'access_calendar',
  '/support': 'access_support',
  '/settings': 'access_settings',
}

// All available permission keys with their display names
export const PERMISSION_DEFINITIONS: Record<StaffPermissionKey, { name: string; description: string }> = {
  access_dashboard: {
    name: 'Dashboard',
    description: 'Access to the main dashboard'
  },
  access_classes: {
    name: 'Classes',
    description: 'View and manage classes'
  },
  access_students: {
    name: 'Students',
    description: 'View and manage students'
  },
  access_applications: {
    name: 'Applications',
    description: 'View and process student applications'
  },
  access_staff: {
    name: 'Staff Management',
    description: 'View and manage staff members'
  },
  access_attendance: {
    name: 'Attendance',
    description: 'Mark and view attendance records'
  },
  access_finances: {
    name: 'Finances',
    description: 'View financial overview and reports'
  },
  access_fees: {
    name: 'Fees',
    description: 'Manage fee plans and structures'
  },
  access_payments: {
    name: 'Payments',
    description: 'View and manage payment records'
  },
  access_messages: {
    name: 'Messages',
    description: 'Send and manage messages'
  },
  access_calendar: {
    name: 'Calendar',
    description: 'View and create calendar events'
  },
  access_support: {
    name: 'Support',
    description: 'Access support tickets'
  },
  access_settings: {
    name: 'Settings',
    description: 'Access organization settings'
  },
}

// Permission mapping for each staff subrole (preset templates)
// These map to the new permission keys
export const STAFF_ROLE_PERMISSIONS: Record<StaffSubrole, StaffPermissionKey[]> = {
  ADMIN: [
    // Full access to everything
    'access_dashboard',
    'access_classes',
    'access_students',
    'access_applications',
    'access_staff',
    'access_attendance',
    'access_finances',
    'access_fees',
    'access_payments',
    'access_messages',
    'access_calendar',
    'access_support',
    'access_settings',
  ],
  TEACHER: [
    // Teaching-focused permissions
    'access_dashboard',
    'access_classes',
    'access_students',
    'access_attendance',
    'access_messages',
    'access_calendar',
    'access_support',
  ],
  FINANCE_OFFICER: [
    // Financial data focused
    'access_dashboard',
    'access_finances',
    'access_fees',
    'access_payments',
    'access_support',
    'access_settings',
  ],
}

// Legacy permission to new permission key mapping
// Used for backward compatibility
export const LEGACY_PERMISSION_MAP: Record<string, StaffPermissionKey[]> = {
  'view_all_data': ['access_dashboard', 'access_students', 'access_support'],
  'view_all_classes': ['access_classes'],
  'mark_attendance': ['access_attendance'],
  'view_applications': ['access_applications'],
  'manage_staff': ['access_staff'],
  'view_invoices': ['access_finances', 'access_payments'],
  'manage_invoices': ['access_fees'],
  'send_messages': ['access_messages'],
  'view_calendar': ['access_calendar'],
  'create_events': ['access_calendar'],
  'access_settings': ['access_settings'],
}

// Helper function to check if a staff subrole has a specific permission (legacy)
export function hasStaffPermission(subrole: StaffSubrole, permission: StaffPermission): boolean {
  // Map legacy permission to new permission keys
  const mappedPermissions = LEGACY_PERMISSION_MAP[permission] || []
  const rolePermissions = STAFF_ROLE_PERMISSIONS[subrole] || []
  
  // Check if any of the mapped permissions are in the role permissions
  return mappedPermissions.some(mapped => rolePermissions.includes(mapped))
}

// Helper function to get all permissions for a staff subrole (legacy)
export function getStaffPermissions(subrole: StaffSubrole): StaffPermission[] {
  // Return legacy permissions for backward compatibility
  // This is mainly used for display purposes
  const rolePermissions = STAFF_ROLE_PERMISSIONS[subrole] || []
  
  // Map back to legacy permissions (simplified)
  const legacyPermissions: StaffPermission[] = []
  if (rolePermissions.includes('access_dashboard')) legacyPermissions.push('view_all_data')
  if (rolePermissions.includes('access_classes')) legacyPermissions.push('view_all_classes')
  if (rolePermissions.includes('access_attendance')) legacyPermissions.push('mark_attendance')
  if (rolePermissions.includes('access_applications')) legacyPermissions.push('view_applications')
  if (rolePermissions.includes('access_staff')) legacyPermissions.push('manage_staff')
  if (rolePermissions.includes('access_finances') || rolePermissions.includes('access_payments')) legacyPermissions.push('view_invoices')
  if (rolePermissions.includes('access_fees')) legacyPermissions.push('manage_invoices')
  if (rolePermissions.includes('access_messages')) legacyPermissions.push('send_messages')
  if (rolePermissions.includes('access_calendar')) legacyPermissions.push('view_calendar', 'create_events')
  if (rolePermissions.includes('access_settings')) legacyPermissions.push('access_settings')
  
  return legacyPermissions
}

// Helper function to get permission keys for a staff subrole (new)
export function getStaffPermissionKeys(subrole: StaffSubrole): StaffPermissionKey[] {
  return STAFF_ROLE_PERMISSIONS[subrole] || []
}

// Helper function to check if a staff subrole has a specific permission key (new)
export function hasStaffPermissionKey(subrole: StaffSubrole, permissionKey: StaffPermissionKey): boolean {
  const rolePermissions = STAFF_ROLE_PERMISSIONS[subrole] || []
  return rolePermissions.includes(permissionKey)
}

// Helper function to check if a staff subrole can perform an action
export function canPerformAction(subrole: StaffSubrole, action: string): boolean {
  // Map common actions to permissions
  const actionPermissionMap: Record<string, StaffPermission> = {
    'add_staff': 'manage_staff',
    'edit_staff': 'manage_staff',
    'delete_staff': 'manage_staff',
    'add_class': 'manage_classes',
    'edit_class': 'manage_classes',
    'delete_class': 'manage_classes',
    'add_student': 'manage_students',
    'edit_student': 'manage_students',
    'delete_student': 'manage_students',
    'mark_attendance': 'mark_attendance',
    'view_attendance': 'view_all_data',
    'create_invoice': 'manage_invoices',
    'edit_invoice': 'manage_invoices',
    'view_invoice': 'view_invoices',
    'mark_payment': 'reconcile_payments',
    'view_reports': 'view_reports',
    'send_message': 'send_messages',
    'create_event': 'create_events',
    'access_settings': 'access_settings'
  }
  
  const permission = actionPermissionMap[action]
  return permission ? hasStaffPermission(subrole, permission) : false
}

// Staff subrole display names
export const STAFF_ROLE_DISPLAY_NAMES: Record<StaffSubrole, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  FINANCE_OFFICER: 'Finance Officer'
}

// Staff subrole descriptions
export const STAFF_ROLE_DESCRIPTIONS: Record<StaffSubrole, string> = {
  ADMIN: 'Full access to everything. Can manage staff, classes, students, payments, and settings.',
  TEACHER: 'Can view all classes, mark attendance, update student information, and send class messages.',
  FINANCE_OFFICER: 'Focused on financial data. Can manage invoices, payments, generate financial reports, and access settings.'
}
