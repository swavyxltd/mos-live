import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { getBillingDay } from '@/lib/billing-day'

/**
 * Server-side check to verify if the organisation has a payment method set up.
 * Returns true if payment is set up, false otherwise.
 * Owner accounts always return true.
 */
export async function checkPaymentMethod(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    // Owner accounts don't need payment checks
    if (session?.user?.isSuperAdmin) {
      return true
    }

    if (!session?.user?.id) {
      return false
    }

    const org = await getActiveOrg()
    if (!org) {
      return false
    }

    // Check platform billing for payment method
    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: org.id },
      select: { defaultPaymentMethodId: true }
    })

    return !!billing?.defaultPaymentMethodId
  } catch (error) {
    return false
  }
}

/**
 * Server-side check to verify if the organisation has a billing day set up.
 * Returns true if billing day is set (1-28), false otherwise.
 * Owner accounts always return true.
 */
export async function checkBillingDay(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    // Owner accounts don't need billing day checks
    if (session?.user?.isSuperAdmin) {
      return true
    }

    if (!session?.user?.id) {
      return false
    }

    const org = await getActiveOrg()
    if (!org) {
      return false
    }

    // Check if billing day is set
    const billingDay = getBillingDay(org)
    return billingDay !== null && billingDay >= 1 && billingDay <= 28
  } catch (error) {
    return false
  }
}

