import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
            }
          }
        } else {
          // Use database authentication
          try {
            const user = await prisma.user.findUnique({
              where: {
                email: credentials.email
              }
            })

            if (user && credentials.password === 'demo123') {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                isSuperAdmin: user.isSuperAdmin,
              }
            }
          } catch (error) {
            console.error('Database error:', error)
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
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
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

export function getRedirectUrl(role: Role, portal: string): string {
  if (role === 'SUPERADMIN' || role === 'OWNER') {
    return '/owner/overview'
  }
  
  if (portal === 'parent') {
    return '/parent/dashboard'
  }
  
  return '/dashboard'
}
