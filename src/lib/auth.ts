import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
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
    console.error('Error getting user role hints:', error)
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
        if (!credentials?.email || !credentials?.password) {
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

          // Check password if stored, otherwise accept demo123 for backward compatibility
          if (user.password) {
            // User has a password stored, verify it
            const isValidPassword = await bcrypt.compare(credentials.password, user.password)
            if (!isValidPassword) {
              console.log(`Invalid password for user: ${credentials.email}`)
              return null
            }
          } else {
            // No password stored, accept demo123 for backward compatibility
            if (credentials.password !== 'demo123') {
              console.log(`Invalid password for user: ${credentials.email} (no password stored)`)
              return null
            }
          }
          
          console.log(`Successfully authenticated user: ${credentials.email}`)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            isSuperAdmin: user.isSuperAdmin,
            staffSubrole: user.staffSubrole,
          }
        } catch (error: any) {
          console.error('Database error during authentication:', error?.message || error)
          console.error('Error stack:', error?.stack)
          // If database connection fails, don't fall back - return null to show error
          return null
        }

        return null
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign in, set user data from authorize function
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin
        token.staffSubrole = user.staffSubrole
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
      }

      const userId = user?.id ?? token.sub
      if (userId) {
        // Fetch fresh user data from database on each JWT refresh/update
        // This ensures name/email changes are reflected immediately
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              name: true,
              email: true,
              image: true,
              isSuperAdmin: true,
              staffSubrole: true
            }
          })

          if (dbUser) {
            // Update token with latest user data from database
            token.name = dbUser.name
            token.email = dbUser.email
            token.image = dbUser.image
            token.isSuperAdmin = dbUser.isSuperAdmin
            token.staffSubrole = dbUser.staffSubrole
          }

          token.roleHints = await getUserRoleHints(userId)
        } catch (error) {
          console.error('Error getting user data in JWT callback:', error)
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
        session.user.name = token.name as string | null
        session.user.email = token.email as string | null
        session.user.image = token.image as string | null
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
