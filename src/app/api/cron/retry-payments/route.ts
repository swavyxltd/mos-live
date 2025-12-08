import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendPaymentFailedWarningPlatform } from '@/lib/mail'
import { logger } from '@/lib/logger'

// This endpoint should be called daily via cron job
// It retries failed payments every 3 days
async function handlePOST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const vercelCron = request.headers.get('x-vercel-cron')
    if (!vercelCron && cronSecret && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find organisations with:
    // 1. Subscription status is 'past_due'
    // 2. Has firstPaymentFailureDate set
    // 3. Org status is ACTIVE
    // 4. Has default payment method
    const orgsToRetry = await prisma.platformOrgBilling.findMany({
      where: {
        subscriptionStatus: 'past_due',
        firstPaymentFailureDate: { not: null },
        defaultPaymentMethodId: { not: null },
        org: {
          status: 'ACTIVE'
        }
      },
      include: {
        org: {
          include: {
            memberships: {
              where: { role: 'OWNER' },
              include: {
                user: {
                  select: { email: true, name: true }
                }
              }
            }
          }
        }
      }
    })

    const results = []

    for (const billing of orgsToRetry) {
      try {
        if (!billing.firstPaymentFailureDate || !billing.stripeCustomerId || !billing.defaultPaymentMethodId) {
          continue
        }

        // Calculate days since first failure
        const daysSinceFirstFailure = Math.floor(
          (today.getTime() - new Date(billing.firstPaymentFailureDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Calculate days since last retry (or first failure if no retry yet)
        const lastRetryDate = billing.lastPaymentRetryDate || billing.firstPaymentFailureDate
        const daysSinceLastRetry = Math.floor(
          (today.getTime() - new Date(lastRetryDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only retry if it's been 3 days since last retry
        if (daysSinceLastRetry < 3) {
          continue
        }

        // Get the latest unpaid invoice for this customer
        const invoices = await stripe.invoices.list({
          customer: billing.stripeCustomerId,
          status: 'open',
          limit: 1
        })

        if (invoices.data.length === 0) {
          // No open invoices, check if subscription exists and create invoice
          if (billing.stripeSubscriptionId) {
            try {
              const invoice = await stripe.invoices.create({
                customer: billing.stripeCustomerId,
                subscription: billing.stripeSubscriptionId,
                auto_advance: false
              })
              await stripe.invoices.finalizeInvoice(invoice.id)
              
              // Retry payment
              const paidInvoice = await stripe.invoices.pay(invoice.id, {
                payment_method: billing.defaultPaymentMethodId
              })

              if (paidInvoice.status === 'paid') {
                // Payment succeeded
                await prisma.platformOrgBilling.update({
                  where: { id: billing.id },
                  data: {
                    subscriptionStatus: 'active',
                    firstPaymentFailureDate: null,
                    paymentRetryCount: 0,
                    lastPaymentRetryDate: null,
                    warningEmailSent: false,
                    lastBilledAt: new Date()
                  }
                })

                results.push({
                  orgId: billing.orgId,
                  orgName: billing.org.name,
                  status: 'succeeded',
                  retryCount: billing.paymentRetryCount + 1
                })
                continue
              }
            } catch (error: any) {
              // Payment failed, continue to retry logic below
              logger.error(`Payment retry failed for org ${billing.orgId}`, error)
            }
          } else {
            continue
          }
        } else {
          const invoice = invoices.data[0]
          
          try {
            // Retry payment
            const paidInvoice = await stripe.invoices.pay(invoice.id, {
              payment_method: billing.defaultPaymentMethodId
            })

            if (paidInvoice.status === 'paid') {
              // Payment succeeded
              await prisma.platformOrgBilling.update({
                where: { id: billing.id },
                data: {
                  subscriptionStatus: 'active',
                  firstPaymentFailureDate: null,
                  paymentRetryCount: 0,
                  lastPaymentRetryDate: null,
                  warningEmailSent: false,
                  lastBilledAt: new Date()
                }
              })

              results.push({
                orgId: billing.orgId,
                orgName: billing.org.name,
                status: 'succeeded',
                retryCount: billing.paymentRetryCount + 1
              })
              continue
            }
          } catch (error: any) {
            // Payment failed, continue to retry logic below
            logger.error(`Payment retry failed for org ${billing.orgId}`, error)
          }
        }

        // Payment failed, increment retry count
        const newRetryCount = billing.paymentRetryCount + 1
        const updateData: any = {
          paymentRetryCount: newRetryCount,
          lastPaymentRetryDate: new Date()
        }

        // If this is the 3rd retry (retryCount will be 3), send warning email
        if (newRetryCount === 3 && !billing.warningEmailSent) {
          const latestInvoice = invoices.data[0]
          if (billing.org.memberships[0]?.user?.email) {
            await sendPaymentFailedWarningPlatform({
              to: billing.org.memberships[0].user.email,
              orgName: billing.org.name,
              updateUrl: `${process.env.APP_BASE_URL}/settings?tab=subscription`,
              amount: latestInvoice?.amount_due || 0,
              failureReason: latestInvoice?.last_payment_error?.message || 'Payment could not be processed'
            })
          }
          updateData.warningEmailSent = true
        }

        await prisma.platformOrgBilling.update({
          where: { id: billing.id },
          data: updateData
        })

        results.push({
          orgId: billing.orgId,
          orgName: billing.org.name,
          status: 'failed',
          retryCount: newRetryCount
        })

        // Create audit log
        await prisma.auditLog.create({
          data: {
            orgId: billing.orgId,
            action: 'PLATFORM_BILLING_RETRY',
            targetType: 'PlatformOrgBilling',
            targetId: billing.id,
            data: JSON.stringify({
              retryCount: newRetryCount,
              daysSinceFirstFailure,
              status: 'failed'
            })
          }
        })
      } catch (error: any) {
        logger.error(`Error processing retry for org ${billing.orgId}`, error)
        results.push({
          orgId: billing.orgId,
          orgName: billing.org.name,
          status: 'error',
          error: error?.message || 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: orgsToRetry.length,
      retried: results.length,
      succeeded: results.filter(r => r.status === 'succeeded').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    })
  } catch (error: any) {
    logger.error('Error in payment retry cron job', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to retry payments',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
async function handleGET(request: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orgsToRetry = await prisma.platformOrgBilling.findMany({
      where: {
        subscriptionStatus: 'past_due',
        firstPaymentFailureDate: { not: null },
        defaultPaymentMethodId: { not: null },
        org: {
          status: 'ACTIVE'
        }
      },
      include: {
        org: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const orgsReadyForRetry = orgsToRetry.filter(billing => {
      if (!billing.firstPaymentFailureDate) return false
      const lastRetryDate = billing.lastPaymentRetryDate || billing.firstPaymentFailureDate
      const daysSinceLastRetry = Math.floor(
        (today.getTime() - new Date(lastRetryDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceLastRetry >= 3
    })

    return NextResponse.json({
      message: `Found ${orgsReadyForRetry.length} organisations ready for payment retry`,
      totalPastDue: orgsToRetry.length,
      readyForRetry: orgsReadyForRetry.map(b => ({
        orgId: b.orgId,
        orgName: b.org.name,
        retryCount: b.paymentRetryCount,
        daysSinceFirstFailure: b.firstPaymentFailureDate
          ? Math.floor((today.getTime() - new Date(b.firstPaymentFailureDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        daysSinceLastRetry: b.lastPaymentRetryDate
          ? Math.floor((today.getTime() - new Date(b.lastPaymentRetryDate).getTime()) / (1000 * 60 * 60 * 24))
          : (b.firstPaymentFailureDate
              ? Math.floor((today.getTime() - new Date(b.firstPaymentFailureDate).getTime()) / (1000 * 60 * 60 * 24))
              : null)
      }))
    })
  } catch (error: any) {
    logger.error('Error checking retry status', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to check retry status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = handlePOST
export const GET = handleGET

