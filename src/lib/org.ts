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
  const cookieStore = await cookies()
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
  const cookieStore = await cookies() as unknown as {
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
  try {
    const orgId = await getActiveOrgId(userId)
    if (!orgId) return null

    return prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        deactivatedAt: true,
        deactivatedReason: true,
        pausedAt: true,
        pausedReason: true,
        lastPaymentDate: true,
        paymentFailureCount: true,
        autoSuspendEnabled: true,
        address: true,
        addressLine1: true,
        postcode: true,
        city: true,
        phone: true,
        publicPhone: true,
        email: true,
        publicEmail: true,
        officeHours: true,
        stripeEnabled: true,
        stripePublishableKey: true,
        stripeSecretKey: true,
        stripeWebhookSecret: true,
        autoPaymentEnabled: true,
        cashPaymentEnabled: true,
        bankTransferEnabled: true,
        paymentInstructions: true,
      }
    })
  } catch (error) {
    console.error('Error getting active org:', error)
    return null
  }
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
  try {
    if (!userId || !orgId) {
      return null
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
  } catch (error) {
    console.error('Error getting user role in org:', error)
    return null
  }
}

export async function getOrgBySlug(slug: string) {
  return prisma.org.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      addressLine1: true,
      postcode: true,
      city: true,
      phone: true,
      publicPhone: true,
      email: true,
      publicEmail: true,
      officeHours: true,
      timezone: true,
      settings: true,
      status: true
    }
  })
}
