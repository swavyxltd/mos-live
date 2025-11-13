export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelStripeSubscription } from '@/lib/stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reason } = await request.json()
    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const { orgId } = resolvedParams

    // Get organization with billing info
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      include: {
        platformBilling: true,
        memberships: {
          where: {
            role: { in: ['ADMIN', 'STAFF'] }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Cancel Stripe subscription if it exists
    let subscriptionCanceled = false
    if (org.platformBilling?.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(org.platformBilling.stripeSubscriptionId)
        subscriptionCanceled = true

        // Update billing record to mark subscription as canceled
        await prisma.platformOrgBilling.update({
          where: { orgId },
          data: {
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            stripeSubscriptionItemId: null
          }
        })

        // Log subscription cancellation
        await prisma.auditLog.create({
          data: {
            orgId: orgId,
            actorUserId: session.user.id,
            action: 'PLATFORM_SUBSCRIPTION_CANCELED',
            targetType: 'PlatformOrgBilling',
            targetId: org.platformBilling.id,
            data: JSON.stringify({
              orgName: org.name,
              subscriptionId: org.platformBilling.stripeSubscriptionId,
              reason: 'Organization deactivated - subscription canceled'
            })
          }
        })
      } catch (error: any) {
        console.error('Error canceling subscription:', error)
        // Continue with suspension even if subscription cancellation fails
        // Log the error but don't block the deactivation
      }
    }

    // Update organization status to SUSPENDED
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: reason || 'Account suspended by platform administrator'
      },
      include: {
        memberships: {
          where: {
            role: { in: ['ADMIN', 'STAFF'] }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId: orgId,
        actorUserId: session.user.id,
        action: 'ORG_SUSPENDED',
        targetType: 'ORG',
        targetId: orgId,
        data: JSON.stringify({
          orgName: updatedOrg.name,
          reason: reason || 'Account suspended by platform administrator',
          subscriptionCanceled,
          affectedUsers: updatedOrg.memberships.map(m => ({
            userId: m.user.id,
            userName: m.user.name,
            userEmail: m.user.email,
            role: m.role
          }))
        })
      }
    })

    const message = subscriptionCanceled
      ? `Organization ${updatedOrg.name} has been suspended and billing has been stopped`
      : `Organization ${updatedOrg.name} has been suspended`

    return NextResponse.json({ 
      success: true, 
      message,
      affectedUsers: updatedOrg.memberships.length,
      subscriptionCanceled
    })

  } catch (error) {
    console.error('Error suspending organization:', error)
    return NextResponse.json({ error: 'Failed to suspend organization' }, { status: 500 })
  }
}
