import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { deleteStripeSubscription, stripe } from '@/lib/stripe'

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins to delete organisations
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Only platform owners can delete organisations.' },
        { status: 401 }
      )
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { orgId } = resolvedParams

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organisation ID is required' },
        { status: 400 }
      )
    }

    // Get org info before deletion for logging
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        stripeConnectAccountId: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    logger.info(`Deleting organisation: ${org.name} (${org.slug})`)

    // Get counts before deletion for logging
    const [
      students,
      classes,
      invoices,
      memberships,
      applications,
      invitations,
      leads
    ] = await Promise.all([
      prisma.student.count({ where: { orgId } }),
      prisma.class.count({ where: { orgId } }),
      prisma.invoice.count({ where: { orgId } }),
      prisma.userOrgMembership.count({ where: { orgId } }),
      prisma.application.count({ where: { orgId } }),
      prisma.invitation.count({ where: { orgId } }),
      prisma.lead.count({ where: { convertedOrgId: orgId } })
    ])

    logger.info(`Deleting organisation with related data: ${students} students, ${classes} classes, ${invoices} invoices, ${memberships} memberships, ${applications} applications, ${invitations} invitations, ${leads} leads`)

    // Cancel platform Stripe subscription if it exists (before deletion)
    try {
      const platformBilling = await prisma.platformOrgBilling.findUnique({
        where: { orgId },
        select: { 
          stripeSubscriptionId: true,
          stripeSubscriptionItemId: true
        }
      })

      if (platformBilling?.stripeSubscriptionId) {
        try {
          // Delete the subscription in Stripe immediately (cancels and removes it)
          await deleteStripeSubscription(platformBilling.stripeSubscriptionId)
          logger.info(`Deleted platform Stripe subscription for organisation: ${org.name}`)
          
          // Clear subscription fields in database after successful cancellation
          await prisma.platformOrgBilling.update({
            where: { orgId },
            data: {
              stripeSubscriptionId: null,
              stripeSubscriptionItemId: null
            }
          })
          logger.info(`Cleared subscription fields in database for organisation: ${org.name}`)
        } catch (stripeError: any) {
          logger.error('Error canceling platform Stripe subscription before deletion', {
            error: stripeError?.message,
            subscriptionId: platformBilling.stripeSubscriptionId
          })
          // Try to clear database fields even if Stripe cancellation fails
          // (subscription might already be canceled or deleted in Stripe)
          try {
            await prisma.platformOrgBilling.update({
              where: { orgId },
              data: {
                stripeSubscriptionId: null,
                stripeSubscriptionItemId: null
              }
            })
            logger.info(`Cleared subscription fields in database despite Stripe error`)
          } catch (dbError: any) {
            logger.error('Error clearing subscription fields in database', {
              error: dbError?.message
            })
          }
          // Continue with deletion even if subscription cancellation fails
        }
      }
    } catch (billingError: any) {
      logger.error('Error fetching platform billing before deletion', billingError)
      // Continue with deletion even if billing fetch fails
    }

    // Cancel all parent billing and detach payment methods
    try {
      const parentBillingProfiles = await prisma.parentBillingProfile.findMany({
        where: { orgId },
        select: {
          id: true,
          parentUserId: true,
          stripeCustomerId: true,
          defaultPaymentMethodId: true,
          autoPayEnabled: true
        }
      })

      if (parentBillingProfiles.length > 0) {
        logger.info(`Canceling ${parentBillingProfiles.length} parent billing profile(s) for organisation: ${org.name}`)
        
        // First, disable auto-pay for all parents to prevent future charges
        const autoPayCount = parentBillingProfiles.filter(p => p.autoPayEnabled).length
        if (autoPayCount > 0) {
          await prisma.parentBillingProfile.updateMany({
            where: { 
              orgId,
              autoPayEnabled: true
            },
            data: {
              autoPayEnabled: false,
              defaultPaymentMethodId: null
            }
          })
          logger.info(`Disabled auto-pay for ${autoPayCount} parent(s)`)
        }
        
        // Then detach payment methods from Stripe
        for (const profile of parentBillingProfiles) {
          try {
            // Detach payment method if it exists
            if (profile.defaultPaymentMethodId && org.stripeConnectAccountId) {
              try {
                await stripe.paymentMethods.detach(profile.defaultPaymentMethodId, {
                  stripeAccount: org.stripeConnectAccountId
                })
                logger.info(`Detached payment method for parent: ${profile.parentUserId}`)
              } catch (pmError: any) {
                logger.error('Error detaching parent payment method', {
                  error: pmError?.message,
                  paymentMethodId: profile.defaultPaymentMethodId,
                  parentUserId: profile.parentUserId
                })
                // Continue even if payment method detachment fails
              }
            }
          } catch (profileError: any) {
            logger.error('Error processing parent billing profile', {
              error: profileError?.message,
              profileId: profile.id,
              parentUserId: profile.parentUserId
            })
            // Continue with other profiles
          }
        }
        
        logger.info(`Processed ${parentBillingProfiles.length} parent billing profile(s) - auto-pay disabled and payment methods detached`)
      }
    } catch (parentBillingError: any) {
      logger.error('Error processing parent billing profiles before deletion', {
        error: parentBillingError?.message,
        orgId
      })
      // Continue with deletion even if parent billing cleanup fails
    }

    // Delete leads that reference this org (if any)
    // Note: Lead.convertedOrgId doesn't have cascade delete, so we need to handle manually
    if (leads > 0) {
      try {
        // First get all lead IDs
        const leadsToDelete = await prisma.lead.findMany({
          where: { convertedOrgId: orgId },
          select: { id: true }
        })
        
        const leadIds = leadsToDelete.map(lead => lead.id)
        
        if (leadIds.length > 0) {
          // Delete lead activities first
          await prisma.leadActivity.deleteMany({
            where: { leadId: { in: leadIds } }
          })
          // Then delete the leads
          await prisma.lead.deleteMany({
            where: { id: { in: leadIds } }
          })
          logger.info(`Deleted ${leadIds.length} lead(s) associated with organisation`)
        }
      } catch (leadError: any) {
        logger.error('Error deleting leads before organisation deletion', {
          error: leadError?.message,
          code: leadError?.code
        })
        // If deletion fails, try to unlink leads instead
        try {
          await prisma.lead.updateMany({
            where: { convertedOrgId: orgId },
            data: { convertedOrgId: null }
          })
          logger.info('Unlinked leads from organisation instead of deleting')
        } catch (unlinkError: any) {
          logger.error('Error unlinking leads from organisation', unlinkError)
          // Continue with deletion attempt
        }
      }
    }

    // Delete ALL users associated with this org (emails are unique, users can't belong to multiple orgs)
    // This must happen BEFORE deleting the org
    try {
      // Get all user IDs that belonged to this org
      const orgMemberships = await prisma.userOrgMembership.findMany({
        where: { orgId },
        select: { userId: true }
      })
      
      const orgUserIds = orgMemberships.map(m => m.userId)
      
      if (orgUserIds.length > 0) {
        // Get all users associated with this org (excluding super admins)
        const usersToDelete = await prisma.user.findMany({
          where: {
            id: { in: orgUserIds },
            isSuperAdmin: false // Never delete super admin accounts
          },
          select: {
            id: true,
            email: true
          }
        })

        if (usersToDelete.length > 0) {
          logger.info(`Found ${usersToDelete.length} user(s) to delete (all users associated with this org)`)
          
          const userIdsToDelete = usersToDelete.map(u => u.id)
          
          // Delete all users' related data
          await Promise.all([
            prisma.account.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.session.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.supportTicketResponse.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.supportTicket.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.giftAidSubmission.deleteMany({ where: { createdById: { in: userIdsToDelete } } }),
            prisma.progressLog.deleteMany({ where: { userId: { in: userIdsToDelete } } }),
            prisma.leadActivity.deleteMany({ where: { createdByUserId: { in: userIdsToDelete } } }),
            prisma.lead.deleteMany({ where: { assignedToUserId: { in: userIdsToDelete } } }),
            prisma.application.updateMany({
              where: { reviewedById: { in: userIdsToDelete } },
              data: { reviewedById: null }
            }),
            prisma.class.updateMany({
              where: { teacherId: { in: userIdsToDelete } },
              data: { teacherId: null }
            }),
            prisma.student.updateMany({
              where: { primaryParentId: { in: userIdsToDelete } },
              data: { primaryParentId: null }
            }),
            prisma.parentBillingProfile.deleteMany({ where: { parentUserId: { in: userIdsToDelete } } }),
            prisma.auditLog.updateMany({
              where: { actorUserId: { in: userIdsToDelete } },
              data: { actorUserId: null }
            })
          ])
          
          // Delete all users associated with this org
          await prisma.user.deleteMany({
            where: { id: { in: userIdsToDelete } }
          })
          
          logger.info(`Deleted ${usersToDelete.length} user(s): ${usersToDelete.map(u => u.email).join(', ')}`)
        } else {
          logger.info('No users found to delete (only super admin accounts associated with this org)')
        }
      }
    } catch (orphanedUserError: any) {
      logger.error('Error deleting orphaned users', {
        error: orphanedUserError?.message,
        code: orphanedUserError?.code
      })
      // Continue with org deletion even if orphaned user deletion fails
    }

    // Delete the organisation
    // Prisma will cascade delete all related records (students, classes, invoices, memberships, etc.)
    await prisma.org.delete({
      where: { id: orgId }
    })

    logger.info(`Organisation ${org.name} deleted successfully with all associated data`)

    return NextResponse.json({
      success: true,
      message: `Organisation "${org.name}" has been deleted`
    })

  } catch (error: any) {
    // Always log full error details to server logs
    logger.error('Error deleting organisation', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack,
      meta: error?.meta,
      orgId
    })
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { 
          error: 'Cannot delete organisation due to existing relationships',
          details: error?.meta?.field_name ? `Foreign key constraint on: ${error.meta.field_name}` : undefined
        },
        { status: 400 }
      )
    }

    // Handle record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Organisation not found or already deleted' },
        { status: 404 }
      )
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to delete organisation',
        ...(isDevelopment && { 
          details: error?.message,
          code: error?.code,
          name: error?.name
        })
      },
      { status: 500 }
    )
  }
}

export const DELETE = withRateLimit(handleDELETE)

