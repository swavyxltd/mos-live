import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

const ORG_COOKIE_NAME = 'madrasah-org-id'

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  const orgId = cookieStore.get(ORG_COOKIE_NAME)?.value
  
  if (!orgId) return null
  
  // Check if we're in demo mode
  const { isDemoMode, DEMO_ORG } = await import('./demo-mode')
  
  if (isDemoMode()) {
    return DEMO_ORG.id
  }
  
  // Verify the org exists
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  return org ? orgId : null
}

export async function setActiveOrgId(orgId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ORG_COOKIE_NAME, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

export async function getActiveOrg() {
  // Check if we're in demo mode first
  const { isDemoMode, DEMO_ORG } = await import('./demo-mode')
  
  if (isDemoMode()) {
    return DEMO_ORG
  }

  const orgId = await getActiveOrgId()
  if (!orgId) return null

  return prisma.org.findUnique({
    where: { id: orgId }
  })
}

export async function getUserOrgs(userId: string) {
  // Check if we're in demo mode
  const { isDemoMode, DEMO_ORG, DEMO_USERS } = await import('./demo-mode')
  
  if (isDemoMode()) {
    const demoUser = Object.values(DEMO_USERS).find(u => u.id === userId)
    if (demoUser) {
      return [{
        org: DEMO_ORG,
        role: demoUser.role
      }]
    }
    return []
  }

  return prisma.userOrgMembership.findMany({
    where: { userId },
    include: {
      org: true
    }
  })
}

export async function getUserRoleInOrg(userId: string, orgId: string): Promise<Role | null> {
  // Check if we're in demo mode
  const { isDemoMode, DEMO_USERS } = await import('./demo-mode')
  
  if (isDemoMode()) {
    const user = Object.values(DEMO_USERS).find(u => u.id === userId)
    return user?.role as Role || null
  }
  
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId
      }
    }
  })
  
  return membership?.role || null
}
