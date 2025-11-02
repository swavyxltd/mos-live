import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { Role } from '@prisma/client'
import { authOptions } from './auth'
import { prisma } from './prisma'

const ORG_COOKIE_NAME = 'madrasah-org-id'

async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) {
    return userId
  }

  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

export async function getActiveOrgId(userId?: string): Promise<string | null> {
  const cookieStore = cookies()
  const cookieOrgId = cookieStore.get(ORG_COOKIE_NAME)?.value ?? null

  if (cookieOrgId) {
    const orgExists = await prisma.org.findUnique({
      where: { id: cookieOrgId },
      select: { id: true }
    })

    if (orgExists) {
      return cookieOrgId
    }
  }

  const resolvedUserId = await resolveUserId(userId)
  if (!resolvedUserId) {
    return null
  }

  const membership = await prisma.userOrgMembership.findFirst({
    where: { userId: resolvedUserId },
    select: { orgId: true }
  })

  return membership?.orgId ?? null
}

export async function setActiveOrgId(orgId: string): Promise<void> {
  const cookieStore = cookies() as unknown as {
    set?: (name: string, value: string, options: {
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax'
      maxAge: number
    }) => void
  }

  if (typeof cookieStore.set !== 'function') {
    console.warn('[org] setActiveOrgId called in a read-only cookies context; skipping cookie write')
    return
  }

  cookieStore.set(ORG_COOKIE_NAME, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })
}

export async function getActiveOrg(userId?: string) {
  const orgId = await getActiveOrgId(userId)
  if (!orgId) return null

  return prisma.org.findUnique({
    where: { id: orgId }
  })
}

export async function getUserOrgs(userId: string) {
  return prisma.userOrgMembership.findMany({
    where: { userId },
    include: {
      org: true
    }
  })
}

export async function getUserRoleInOrg(userId: string, orgId: string): Promise<Role | null> {
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

export async function getOrgBySlug(slug: string) {
  return prisma.org.findUnique({
    where: { slug }
  })
}
