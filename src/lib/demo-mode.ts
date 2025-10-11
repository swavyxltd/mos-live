// Demo mode utilities for development without database
export const DEMO_ORG = {
  id: 'demo-org-1',
  name: 'Leicester Islamic Centre',
  slug: 'leicester-islamic-centre',
  timezone: 'Europe/London'
}

export const DEMO_USERS = {
  'owner@demo.com': {
    id: 'demo-owner-1',
    email: 'owner@demo.com',
    name: 'Ahmed Hassan',
    isSuperAdmin: true,
    role: 'OWNER'
  },
  'admin@demo.com': {
    id: 'demo-admin-1',
    email: 'admin@demo.com',
    name: 'Fatima Ali',
    isSuperAdmin: false,
    role: 'ADMIN'
  },
  'staff@demo.com': {
    id: 'demo-staff-1',
    email: 'staff@demo.com',
    name: 'Omar Khan',
    isSuperAdmin: false,
    role: 'STAFF',
    staffSubrole: 'ADMIN' // Staff Admin with full access
  },
  'teacher@demo.com': {
    id: 'demo-teacher-1',
    email: 'teacher@demo.com',
    name: 'Sarah Ahmed',
    isSuperAdmin: false,
    role: 'STAFF',
    staffSubrole: 'TEACHER' // Teacher with teaching permissions
  },
  'finance@demo.com': {
    id: 'demo-finance-1',
    email: 'finance@demo.com',
    name: 'Hassan Ali',
    isSuperAdmin: false,
    role: 'STAFF',
    staffSubrole: 'FINANCE_OFFICER' // Finance Officer with financial permissions
  },
  'parent@demo.com': {
    id: 'demo-parent-1',
    email: 'parent@demo.com',
    name: 'Aisha Patel',
    isSuperAdmin: false,
    role: 'PARENT'
  }
}

export function validateDemoCredentials(email: string, password: string) {
  if (password !== 'demo123') return null
  
  const user = DEMO_USERS[email as keyof typeof DEMO_USERS]
  if (user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      role: user.role,
      staffSubrole: (user as any).staffSubrole
    }
  }
  return null
}

export function isDemoMode(): boolean {
  // Enable demo mode if we're in development or if DATABASE_URL is not set
  return process.env.NODE_ENV === 'development' || 
         !process.env.DATABASE_URL || 
         process.env.DATABASE_URL.includes('demo')
}
