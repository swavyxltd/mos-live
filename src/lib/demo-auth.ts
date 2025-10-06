// Demo authentication for development without database
export const DEMO_USERS = {
  'owner@demo.com': {
    id: 'demo-owner-1',
    email: 'owner@demo.com',
    name: 'Ahmed Hassan',
    isSuperAdmin: true,
    password: 'demo123'
  },
  'admin@demo.com': {
    id: 'demo-admin-1',
    email: 'admin@demo.com',
    name: 'Fatima Ali',
    isSuperAdmin: false,
    password: 'demo123'
  },
  'teacher@demo.com': {
    id: 'demo-teacher-1',
    email: 'teacher@demo.com',
    name: 'Omar Khan',
    isSuperAdmin: false,
    password: 'demo123'
  },
  'parent@demo.com': {
    id: 'demo-parent-1',
    email: 'parent@demo.com',
    name: 'Aisha Patel',
    isSuperAdmin: false,
    password: 'demo123'
  }
}

export function validateDemoCredentials(email: string, password: string) {
  const user = DEMO_USERS[email as keyof typeof DEMO_USERS]
  if (user && user.password === password) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin
    }
  }
  return null
}
