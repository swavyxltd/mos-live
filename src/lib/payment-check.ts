import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

/**
 * Server-side check to verify if the organization has a payment method set up.
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
    console.error('Error checking payment method:', error)
    return false
  }
}

