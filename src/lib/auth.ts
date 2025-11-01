import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
// import { Role } from '@prisma/client'

// Helper function to get user role hints
async function getUserRoleHints(userId: string) {
  // Check if we're in demo mode
  const { isDemoMode, DEMO_USERS } = await import('./demo-mode')
  
  if (isDemoMode()) {
    const user = Object.values(DEMO_USERS).find(u => u.id === userId)
    if (!user) {
      return {
        isOwner: false,
        orgAdminOf: [],
        orgStaffOf: [],
        isParent: false
      }
    }
    
    return {
      isOwner: user.isSuperAdmin || user.role === 'OWNER',
      orgAdminOf: user.role === 'ADMIN' ? ['demo-org-1'] : [],
      orgStaffOf: user.role === 'STAFF' ? ['demo-org-1'] : [],
      isParent: user.role === 'PARENT'
    }
  }
  
  // Get user's organization memberships
  const memberships = await prisma.userOrgMembership.findMany({
    where: { userId },
    include: { org: true }
  })
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  const isOwner = user?.isSuperAdmin || false
  const orgAdminOf: string[] = []
  const orgStaffOf: string[] = []
  let isParent = false
  
  for (const membership of memberships) {
    if (membership.role === 'ADMIN') {
      orgAdminOf.push(membership.orgId)
    } else if (['STAFF', 'ADMIN'].includes(membership.role)) {
      orgStaffOf.push(membership.orgId)
    } else if (membership.role === 'PARENT') {
      isParent = true
    }
  }
  
  return {
    isOwner,
    orgAdminOf,
    orgStaffOf,
    isParent
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  // Use NEXTAUTH_URL if set, otherwise construct from request
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check if we're in demo mode
        const { isDemoMode, validateDemoCredentials } = await import('./demo-mode')
        
        // Always check demo credentials first if in demo mode
        if (isDemoMode()) {
          // Use demo mode authentication
          const demoUser = validateDemoCredentials(credentials.email, credentials.password)
          
          if (demoUser) {
            return {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name,
              image: null,
              isSuperAdmin: demoUser.isSuperAdmin,
              staffSubrole: demoUser.staffSubrole,
            }
          }
          // If demo mode is enabled but credentials don't match, return null
          return null
        }
        
        // Use database authentication
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            console.log(`User not found: ${credentials.email}`)
            return null
          }

          // For now, accept 'demo123' as the password for all database users
          // TODO: Add password field to User model and use bcrypt for production
          if (credentials.password === 'demo123') {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              isSuperAdmin: user.isSuperAdmin,
              staffSubrole: user.staffSubrole,
            }
          }

          console.log(`Invalid password for user: ${credentials.email}`)
          return null
        } catch (error) {
          console.error('Database error during authentication:', error)
          // If database connection fails, fall back to demo mode
          const demoUser = validateDemoCredentials(credentials.email, credentials.password)
          if (demoUser) {
            console.log('Falling back to demo mode authentication')
            return {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name,
              image: null,
              isSuperAdmin: demoUser.isSuperAdmin,
              staffSubrole: demoUser.staffSubrole,
            }
          }
        }

        return null
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin
        token.staffSubrole = user.staffSubrole
        // Get role hints when user first signs in
        if (user.id) {
          token.roleHints = await getUserRoleHints(user.id)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
        session.user.staffSubrole = token.staffSubrole as string
        session.user.roleHints = token.roleHints as {
          isOwner: boolean
          orgAdminOf: string[]
          orgStaffOf: string[]
          isParent: boolean
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If the URL is already absolute, return it
      if (url.startsWith('http')) return url
      
      // If the URL starts with '/', make it absolute
      if (url.startsWith('/')) return `${baseUrl}${url}`
      
      // Default redirect to dashboard
      return `${baseUrl}/dashboard`
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
}

// Post-login redirect function based on role hints
export function getPostLoginRedirect(roleHints: {
  isOwner: boolean
  orgAdminOf: string[]
  orgStaffOf: string[]
  isParent: boolean
}): string {
  // Priority order: Owner → Admin → Staff → Parent → Fallback
  
  // 1) Owner → /owner
  if (roleHints.isOwner) {
    return '/owner/overview'
  }
  
  // 2) Admin (org admin) → /dashboard
  if (roleHints.orgAdminOf.length > 0) {
    return '/dashboard'
  }
  
  // 3) Staff (any staff role) → /staff
  if (roleHints.orgStaffOf.length > 0) {
    return '/staff'
  }
  
  // 4) Parent → /parent
  if (roleHints.isParent) {
    return '/parent/dashboard'
  }
  
  // 5) Otherwise → /auth/signin (fallback)
  return '/auth/signin'
}

export function getRedirectUrl(role: Role, portal: string): string {
  if (role === 'SUPERADMIN' || role === 'OWNER') {
    return '/owner/overview'
  }
  
  if (portal === 'parent') {
    return '/parent/dashboard'
  }
  
  return '/dashboard'
}
