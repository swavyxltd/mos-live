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
    // Get user's organisation memberships
    const memberships = await prisma.userOrgMembership.findMany({
      where: { userId },
      include: { 
        Org: {
          select: {
            id: true
          }
        }
      }
    })
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperAdmin: true
      }
    })
    
    const isOwner = user?.isSuperAdmin || false
    const orgAdminOf: string[] = []
    const orgStaffOf: string[] = []
    let isParent = false
    let staffSubrole: string | null = null // Track staffSubrole from first active org
    
    // Include organisations in role hints
    for (const membership of memberships) {
      // Skip if org is null
      if (!membership.Org) {
        continue
      }
      
      if (membership.role === 'ADMIN') {
        orgAdminOf.push(membership.orgId)
        // ADMIN is also staff
        if (!orgStaffOf.includes(membership.orgId)) {
          orgStaffOf.push(membership.orgId)
        }
        // Store staffSubrole from admin/staff membership (prioritize FINANCE_OFFICER if found)
        if (membership.staffSubrole) {
          // Prioritize FINANCE_OFFICER subrole if found, otherwise use first non-null subrole
          if (membership.staffSubrole === 'FINANCE_OFFICER' || !staffSubrole) {
            staffSubrole = membership.staffSubrole
          }
        }
      } else if (membership.role === 'STAFF') {
        if (!orgStaffOf.includes(membership.orgId)) {
          orgStaffOf.push(membership.orgId)
        }
        // Store staffSubrole from staff membership (prioritize FINANCE_OFFICER if found)
        if (membership.staffSubrole) {
          // Prioritize FINANCE_OFFICER subrole if found, otherwise use first non-null subrole
          if (membership.staffSubrole === 'FINANCE_OFFICER' || !staffSubrole) {
            staffSubrole = membership.staffSubrole
          }
        }
      } else if (membership.role === 'PARENT') {
        isParent = true
      }
    }
    
    return {
      isOwner,
      orgAdminOf,
      orgStaffOf,
      isParent,
      staffSubrole
    }
  } catch (error: any) {
    // Log error server-side only (not to console in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Error in getUserRoleHints:', error?.message, error?.stack)
    }
    // Return default role hints on error to allow authentication
    // Layouts will handle blocking if needed
    return {
      isOwner: false,
      orgAdminOf: [],
      orgStaffOf: [],
      isParent: false,
      staffSubrole: null
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
          // Only block if 2FA is explicitly enabled (true)
          if (user.twoFactorEnabled === true) {
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
            console.error('[Auth] Authorize error:', error?.message, error?.stack)
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
    // 30 days for both browser sessions and PWA
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Update session once per day to keep it fresh
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined, // Allow cookies on all subdomains
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds - cookie persists across browser sessions
        // Note: PWA sessions also use 30 days (same as regular browser sessions)
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.madrasah.io' : undefined,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Set token expiration to 30 days (matching session maxAge)
      // This ensures the JWT token itself doesn't expire before the cookie
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60
      const now = Math.floor(Date.now() / 1000)
      
      if (user) {
        token.isSuperAdmin = user.isSuperAdmin
        token.staffSubrole = user.staffSubrole
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
        // Set expiration when user first signs in
        token.exp = now + thirtyDaysInSeconds
      } else if (token.exp) {
        // If token is about to expire (within 1 day), extend it
        const oneDayInSeconds = 24 * 60 * 60
        if (token.exp - now < oneDayInSeconds) {
          token.exp = now + thirtyDaysInSeconds
        }
      } else {
        // If token doesn't have exp, set it (shouldn't happen, but safety check)
        token.exp = now + thirtyDaysInSeconds
      }

      const userId = user?.id ?? token.sub
      if (userId) {
        // Always ensure isSuperAdmin is fresh from database on every request
        // This is critical for production where tokens might be cached
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              isSuperAdmin: true
            }
          })
          
          if (dbUser !== null) {
            token.isSuperAdmin = dbUser.isSuperAdmin
          }
        } catch (error) {
          // If database query fails, keep existing token value
          // Log error server-side only (not to console in production)
          if (process.env.NODE_ENV === 'development') {
            console.error('[Auth] Error fetching isSuperAdmin:', error)
          }
        }

        // When trigger is 'update' (when update() is called), ALWAYS fetch fresh data from database
        // This ensures profile changes (name, email, image, phone, address, etc.) are immediately reflected
        if (trigger === 'update') {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                name: true,
                email: true,
                image: true,
                isSuperAdmin: true,
                staffSubrole: true,
                phone: true,
                address: true,
                city: true,
                postcode: true,
                title: true,
                giftAidStatus: true
              }
            })
            
            if (dbUser) {
              token.name = dbUser.name
              token.email = dbUser.email
              token.image = dbUser.image
              token.isSuperAdmin = dbUser.isSuperAdmin
              token.staffSubrole = dbUser.staffSubrole
              token.phone = dbUser.phone
              token.address = dbUser.address
              token.city = dbUser.city
              token.postcode = dbUser.postcode
              token.title = dbUser.title
              token.giftAidStatus = dbUser.giftAidStatus
            }
          } catch (error) {
            // Log error server-side only (not to console in production)
            if (process.env.NODE_ENV === 'development') {
              console.error('[Auth] Error fetching user data on update:', error)
            }
          }
        }
        
        // Also fetch fresh data if token doesn't have name (initial login)
        if (!token.name && userId) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: {
                name: true,
                email: true,
                image: true,
                isSuperAdmin: true,
                staffSubrole: true,
                phone: true,
                address: true,
                city: true,
                postcode: true,
                title: true,
                giftAidStatus: true
              }
            })
            
            if (dbUser) {
              token.name = dbUser.name
              token.email = dbUser.email
              token.image = dbUser.image
              token.isSuperAdmin = dbUser.isSuperAdmin
              token.staffSubrole = dbUser.staffSubrole
              token.phone = dbUser.phone
              token.address = dbUser.address
              token.city = dbUser.city
              token.postcode = dbUser.postcode
              token.title = dbUser.title
              token.giftAidStatus = dbUser.giftAidStatus
            }
          } catch (error) {
            // Log error server-side only (not to console in production)
            if (process.env.NODE_ENV === 'development') {
              console.error('[Auth] Error fetching user data on initial login:', error)
            }
          }
        }

        // ALWAYS fetch fresh roleHints on every request to ensure they're up-to-date
        // This is critical because roleHints determine portal access
        try {
          const freshRoleHints = await getUserRoleHints(userId)
          token.roleHints = freshRoleHints
          
          // Also update token.staffSubrole from roleHints for backward compatibility
          // staffSubrole is org-specific, so we use the first one found
          if (freshRoleHints.staffSubrole) {
            token.staffSubrole = freshRoleHints.staffSubrole
          }
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Fresh roleHints fetched:', {
              userId,
              email: token.email,
              roleHints: freshRoleHints
            })
          }
        } catch (error: any) {
          // Log error server-side only (not to console in production)
          if (process.env.NODE_ENV === 'development') {
            console.error('[Auth] Error fetching role hints:', error?.message, error?.stack)
          }
          // Set default role hints on error to allow authentication
          token.roleHints = {
            isOwner: false,
            orgAdminOf: [],
            orgStaffOf: [],
            isParent: false,
            staffSubrole: null
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.name = token.name as string | null | undefined
        session.user.email = token.email as string | null | undefined
        session.user.image = token.image as string | null | undefined
        // Ensure isSuperAdmin is always a boolean, defaulting to false if undefined
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin ?? false)
        session.user.staffSubrole = token.staffSubrole as string
        // Include all user profile fields in session
        session.user.phone = token.phone as string | null | undefined
        session.user.address = token.address as string | null | undefined
        session.user.city = token.city as string | null | undefined
        session.user.postcode = token.postcode as string | null | undefined
        session.user.title = token.title as string | null | undefined
        session.user.giftAidStatus = token.giftAidStatus as string | null | undefined
        // Ensure roleHints is always set, even if there was an error fetching it
        session.user.roleHints = (token.roleHints as {
          isOwner: boolean
          orgAdminOf: string[]
          orgStaffOf: string[]
          isParent: boolean
          staffSubrole?: string | null
        }) || {
          isOwner: false,
          orgAdminOf: [],
          orgStaffOf: [],
          isParent: false,
          staffSubrole: null
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
  staffSubrole?: string | null
}): string {
  // Priority order: Parent → Owner → Admin → Staff → Fallback
  // Note: Parent is checked FIRST to ensure parents always go to parent portal,
  // even if they also have owner/admin/staff roles
  
  // 1) Parent → /parent/dashboard (checked FIRST to prioritize parent portal)
  if (roleHints.isParent) {
    return '/parent/dashboard'
  }
  
  // 2) Owner → /owner
  if (roleHints.isOwner) {
    return '/owner/overview'
  }
  
  // 3) Check staffSubrole first (before admin check) to prioritize role-specific redirects
  // Finance Officers should go to finances page regardless of admin status
  if (roleHints.staffSubrole === 'FINANCE_OFFICER') {
    return '/finances'
  }
  
  // 4) Admin (org admin) → /dashboard
  if (roleHints.orgAdminOf.length > 0) {
    return '/dashboard'
  }
  
  // 5) Staff (any staff role) → dashboard
  if (roleHints.orgStaffOf.length > 0) {
    // Teachers and other staff go to dashboard (teachers see filtered stats)
    return '/dashboard'
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
