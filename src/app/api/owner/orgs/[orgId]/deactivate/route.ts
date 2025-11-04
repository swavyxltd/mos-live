export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { sendOrgDeactivationEmail } from '@/lib/mail'
import { cancelStripeSubscription } from '@/lib/stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await requireRole(['OWNER'])(request)
    if (session instanceof NextResponse) return session

    const { orgId } = params
    const { reason } = await request.json()

    // Get organization details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        platformBilling: true
      }
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Cancel Stripe subscription if exists
    if (org.platformBilling?.stripeSubscriptionId) {
      try {
        await cancelStripeSubscription(org.platformBilling.stripeSubscriptionId)
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError)
        // Continue with deactivation even if Stripe cancellation fails
      }
    }

    // Update organization status to DEACTIVATED
    await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'DEACTIVATED',
        deactivatedAt: new Date(),
        deactivatedReason: reason || 'Account deactivated by platform administrator'
      }
    })

    // Update platform billing status
    if (org.platformBilling) {
      await prisma.platformOrgBilling.update({
        where: { orgId },
        data: {
          subscriptionStatus: 'canceled'
        }
      })
    }

    // Send farewell email to all admins
    const adminEmails = org.memberships
      .filter(m => m.role === 'ADMIN' || m.role === 'OWNER')
      .map(m => m.user.email)
      .filter(Boolean) as string[]

    for (const email of adminEmails) {
      try {
        await sendOrgDeactivationEmail({
          to: email,
          orgName: org.name,
          adminName: org.memberships.find(m => m.user.email === email)?.user?.name || 'Admin'
        })
      } catch (emailError) {
        console.error(`Error sending deactivation email to ${email}:`, emailError)
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'ORG_DEACTIVATED',
        targetType: 'ORG',
        targetId: orgId,
        data: {
          orgName: org.name,
          reason: reason || 'Account deactivated by platform administrator',
          affectedUsers: org.memberships.length
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Organization ${org.name} has been deactivated`,
      affectedUsers: org.memberships.length
    })
  } catch (error) {
    console.error('Error deactivating organization:', error)
    return NextResponse.json({ error: 'Failed to deactivate organization' }, { status: 500 })
  }
}

