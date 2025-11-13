import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { checkEmailRateLimit } from './rate-limit'
// import { Role } from '@prisma/client'

// Helper function to get user role hints
async function getUserRoleHints(userId: string) {
  try {
    // Get user's organization memberships
    const memberships = await prisma.userOrgMembership.findMany({
      where: { userId },
      include: { 
        org: {
          select: {
            id: true
          }
        }
      }
    })
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    const isOwner = user?.isSuperAdmin || false
    const orgAdminOf: string[] = []
    const orgStaffOf: string[] = []
    let isParent = false
    
        // Include organizations in role hints
        for (const membership of memberships) {
          // Skip if org is null
          if (!membership.org) {
            continue
          }
      
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
  } catch (error) {
    // Log error server-side only (not to console in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting user role hints:', error)
    }
    // Return default role hints on error to allow authentication
    // Layouts will handle blocking if needed
    return {
      isOwner: false,
      orgAdminOf: [],
      orgStaffOf: [],
      isParent: false
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  // Use NEXTAUTH_URL if set, otherwise construct from request
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // Use database authentication
        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase()
            }
          })

          if (!user) {
            // Don't reveal if user exists to prevent enumeration
            return null
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            // Account is locked
            return null
          }

          // Check if this is a post-2FA signin (password is the signin token)
          if (credentials.password && credentials.password.length === 12 && /^\d{12}$/.test(credentials.password)) {
            // This is a signin token after 2FA verification
            if (user.twoFactorCode === credentials.password && 
                user.twoFactorCodeExpiry && 
                user.twoFactorCodeExpiry > new Date()) {
              // Token is valid - clear it and create session
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  twoFactorCode: null,
                  twoFactorCodeExpiry: null,
                  failedLoginAttempts: 0,
                  lockedUntil: null,
                  lastFailedLoginAttempt: null
                }
              })

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                isSuperAdmin: user.isSuperAdmin,
                staffSubrole: user.staffSubrole,
              }
            }
            // Invalid or expired token
            return null
          }

          // Regular password authentication
          if (!credentials.password) {
            return null
          }

          // Check rate limit by email
          const emailRateLimit = checkEmailRateLimit(credentials.email)
          if (!emailRateLimit.allowed) {
            // Rate limit exceeded - don't reveal this to prevent enumeration
            return null
          }

          // SECURITY: Require password for all users - no fallback passwords
          if (!user.password) {
            // User has no password set - account is disabled for security
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, user.password)
          
          if (!isValidPassword) {
            // Increment failed login attempts
            const newFailedAttempts = (user.failedLoginAttempts || 0) + 1
            const lockoutDuration = 30 * 60 * 1000 // 30 minutes
            const shouldLockAccount = newFailedAttempts >= 5

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newFailedAttempts,
                lastFailedLoginAttempt: new Date(),
                ...(shouldLockAccount && {
                  lockedUntil: new Date(Date.now() + lockoutDuration)
                })
              }
            })

            // Don't reveal if password was wrong to prevent enumeration
            return null
          }

          // Password is valid - but check if 2FA is enabled
          // If 2FA is enabled, we should not create session here
          // The custom signin API will handle 2FA flow
          // For now, we'll allow it if 2FA is disabled
          if (user.twoFactorEnabled) {
            // 2FA is enabled - don't create session here
            // The custom signin API will handle the 2FA flow
            return null
          }

          // Successful login - reset failed attempts and unlock account
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastFailedLoginAttempt: null
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            isSuperAdmin: user.isSuperAdmin,
            staffSubrole: user.staffSubrole,
          }
        } catch (error: any) {
          // Log error server-side only (not to console in production)
          if (process.env.NODE_ENV === 'development') {
            console.error('Database error during authentication:', error?.message || error)
          }
          // If database connection fails, don't fall back - return null to show error
          return null
        }

        return null
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin
        token.staffSubrole = user.staffSubrole
        token.sub = user.id
      }

      const userId = user?.id ?? token.sub
      if (userId) {
        try {
          token.roleHints = await getUserRoleHints(userId)
        } catch (error) {
          // Log error server-side only (not to console in production)
          if (process.env.NODE_ENV === 'development') {
            console.error('Error getting role hints in JWT callback:', error)
          }
          // Set default role hints on error to allow authentication
          token.roleHints = {
            isOwner: false,
            orgAdminOf: [],
            orgStaffOf: [],
            isParent: false
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false
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
