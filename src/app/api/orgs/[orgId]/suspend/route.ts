export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelStripeSubscription } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(
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

    // Sanitize reason
    const sanitizedReason = reason ? sanitizeText(reason, MAX_STRING_LENGTHS.text) : 'Account deactivated by platform administrator'

    // Get organisation with billing info
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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
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
            stripeSubscriptionItemId: null,
            updatedAt: new Date()
          }
        })

        // Log subscription cancellation
        await prisma.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            orgId: orgId,
            actorUserId: session.user.id,
            action: 'PLATFORM_SUBSCRIPTION_CANCELED',
            targetType: 'PlatformOrgBilling',
            targetId: org.platformBilling.id,
            data: JSON.stringify({
              orgName: org.name,
              subscriptionId: org.platformBilling.stripeSubscriptionId,
              reason: 'Organisation deactivated - subscription canceled'
            })
          }
        })
      } catch (error: any) {
        logger.error('Error canceling subscription', error)
        // Continue with suspension even if subscription cancellation fails
        // Log the error but don't block the deactivation
      }
    }

    // Update organisation status to DEACTIVATED
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'DEACTIVATED',
        deactivatedAt: new Date(),
        deactivatedReason: sanitizedReason,
        updatedAt: new Date()
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
        id: crypto.randomUUID(),
        orgId: orgId,
        actorUserId: session.user.id,
        action: 'ORG_DEACTIVATED',
        targetType: 'ORG',
        targetId: orgId,
        data: JSON.stringify({
          orgName: updatedOrg.name,
          reason: sanitizedReason,
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
      ? `Organisation ${updatedOrg.name} has been deactivated and billing has been stopped`
      : `Organisation ${updatedOrg.name} has been deactivated`

    return NextResponse.json({ 
      success: true, 
      message,
      affectedUsers: updatedOrg.memberships.length,
      subscriptionCanceled
    })

  } catch (error: any) {
    logger.error('Error deactivating organisation', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to deactivate organisation',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
