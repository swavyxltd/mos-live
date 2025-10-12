// Staff subrole types within the staff portal
export type StaffSubrole = 'ADMIN' | 'TEACHER' | 'FINANCE_OFFICER'

// Permission types for staff subroles
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

// Permission mapping for each staff subrole
export const STAFF_ROLE_PERMISSIONS: Record<StaffSubrole, StaffPermission[]> = {
  ADMIN: [
    // Full access to everything
    'manage_staff',
    'manage_classes',
    'manage_students',
    'manage_payments',
    'assign_roles',
    'view_reports',
    'view_invoices',
    'view_applications',
    'send_messages',
    'send_announcements',
    'create_events',
    'access_settings',
    'view_all_classes',
    'mark_attendance',
    'update_student_info',
    'create_class_events',
    'send_class_messages',
    'view_students_billing',
    'manage_invoices',
    'reconcile_payments',
    'mark_cash_payments',
    'generate_financial_reports',
    'view_all_data'
  ],
  TEACHER: [
    // Teaching-focused permissions
    'view_all_classes',
    'mark_attendance',
    'update_student_info',
    'create_class_events',
    'send_class_messages',
    'view_all_data'
  ],
  FINANCE_OFFICER: [
    // Financial data focused
    'view_students_billing',
    'manage_invoices',
    'view_invoices',
    'reconcile_payments',
    'mark_cash_payments',
    'generate_financial_reports',
    'access_settings',
    'view_all_data'
  ],
}

// Helper function to check if a staff subrole has a specific permission
export function hasStaffPermission(subrole: StaffSubrole, permission: StaffPermission): boolean {
  return STAFF_ROLE_PERMISSIONS[subrole].includes(permission)
}

// Helper function to get all permissions for a staff subrole
export function getStaffPermissions(subrole: StaffSubrole): StaffPermission[] {
  return STAFF_ROLE_PERMISSIONS[subrole]
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
