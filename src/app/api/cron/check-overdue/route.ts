import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlatformSettings } from '@/lib/platform-settings'
import { stripe } from '@/lib/stripe'
import { sendPaymentFailedWarningPlatform } from '@/lib/mail'
import { logger } from '@/lib/logger'

// This endpoint should be called daily via cron job
// It retries failed payments every 3 days, then checks for organizations with overdue payments beyond grace period and suspends them
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

    // Get platform settings for grace period
    const platformSettings = await getPlatformSettings()
    const gracePeriodDays = platformSettings?.gracePeriodDays || 14

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDay = today.getDate()
    const todayMonth = today.getMonth()
    const todayYear = today.getFullYear()

    // STEP 1: Retry failed payments (every 3 days)
    const retryResults = []
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

    for (const billing of orgsToRetry) {
      try {
        if (!billing.firstPaymentFailureDate || !billing.stripeCustomerId || !billing.defaultPaymentMethodId) {
          continue
        }

        const lastRetryDate = billing.lastPaymentRetryDate || billing.firstPaymentFailureDate
        const daysSinceLastRetry = Math.floor(
          (today.getTime() - new Date(lastRetryDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceLastRetry < 3) {
          continue
        }

        const invoices = await stripe.invoices.list({
          customer: billing.stripeCustomerId,
          status: 'open',
          limit: 1
        })

        if (invoices.data.length === 0) {
          if (billing.stripeSubscriptionId) {
            try {
              const invoice = await stripe.invoices.create({
                customer: billing.stripeCustomerId,
                subscription: billing.stripeSubscriptionId,
                auto_advance: false
              })
              await stripe.invoices.finalizeInvoice(invoice.id)
              
              const paidInvoice = await stripe.invoices.pay(invoice.id, {
                payment_method: billing.defaultPaymentMethodId
              })

              if (paidInvoice.status === 'paid') {
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

                retryResults.push({
                  orgId: billing.orgId,
                  orgName: billing.org.name,
                  status: 'succeeded',
                  retryCount: billing.paymentRetryCount + 1
                })
                continue
              }
            } catch (error: any) {
              logger.error(`Payment retry failed for org ${billing.orgId}`, error)
            }
          } else {
            continue
          }
        } else {
          const invoice = invoices.data[0]
          
          try {
            const paidInvoice = await stripe.invoices.pay(invoice.id, {
              payment_method: billing.defaultPaymentMethodId
            })

            if (paidInvoice.status === 'paid') {
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

              retryResults.push({
                orgId: billing.orgId,
                orgName: billing.org.name,
                status: 'succeeded',
                retryCount: billing.paymentRetryCount + 1
              })
              continue
            }
          } catch (error: any) {
            logger.error(`Payment retry failed for org ${billing.orgId}`, error)
          }
        }

        const newRetryCount = billing.paymentRetryCount + 1
        const updateData: any = {
          paymentRetryCount: newRetryCount,
          lastPaymentRetryDate: new Date()
        }

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

        retryResults.push({
          orgId: billing.orgId,
          orgName: billing.org.name,
          status: 'failed',
          retryCount: newRetryCount
        })

        await prisma.auditLog.create({
          data: {
            orgId: billing.orgId,
            action: 'PLATFORM_BILLING_RETRY',
            targetType: 'PlatformOrgBilling',
            targetId: billing.id,
            data: JSON.stringify({
              retryCount: newRetryCount,
              daysSinceFirstFailure: Math.floor((today.getTime() - new Date(billing.firstPaymentFailureDate).getTime()) / (1000 * 60 * 60 * 24)),
              status: 'failed'
            })
          }
        })
      } catch (error: any) {
        logger.error(`Error processing retry for org ${billing.orgId}`, error)
        retryResults.push({
          orgId: billing.orgId,
          orgName: billing.org.name,
          status: 'error',
          error: error?.message || 'Unknown error'
        })
      }
    }

    // STEP 2: Check for overdue organizations and suspend them
    // Find organizations with:
    // 1. Subscription status is 'past_due' OR has billing anniversary that passed grace period
    // 2. Status is ACTIVE (not already deactivated)
    // 3. Has a billing anniversary date
    // 4. Auto-suspend is enabled
    const overdueOrgs = await prisma.platformOrgBilling.findMany({
      where: {
        OR: [
          {
            subscriptionStatus: 'past_due',
            org: {
              status: 'ACTIVE',
              autoSuspendEnabled: true
            }
          },
          {
            subscriptionStatus: {
              in: ['active', 'trialing', 'past_due']
            },
            org: {
              status: 'ACTIVE',
              autoSuspendEnabled: true
            },
            billingAnniversaryDate: {
              not: null
            }
          }
        ]
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            status: true,
            deactivatedAt: true,
            deactivatedReason: true
          }
        }
      }
    })

    const results = []

    for (const billing of overdueOrgs) {
      try {
        // Skip if already deactivated
        if (billing.org.status === 'DEACTIVATED') {
          continue
        }

        // Calculate days overdue based on first payment failure date or billing anniversary
        let daysOverdue = 0
        let shouldSuspend = false
        let lastBilledDate: Date | null = null

        if (billing.subscriptionStatus === 'past_due') {
          // Priority: Use firstPaymentFailureDate if available (new retry system)
          if (billing.firstPaymentFailureDate) {
            const firstFailureDate = new Date(billing.firstPaymentFailureDate)
            daysOverdue = Math.floor((today.getTime() - firstFailureDate.getTime()) / (1000 * 60 * 60 * 24))
            // Suspend if 14 days have passed since first failure
            shouldSuspend = daysOverdue >= 14
            lastBilledDate = billing.lastBilledAt ? new Date(billing.lastBilledAt) : null
          } else if (billing.lastBilledAt) {
            // Fallback to lastBilledAt if firstPaymentFailureDate not set (legacy)
            lastBilledDate = new Date(billing.lastBilledAt)
            daysOverdue = Math.floor((today.getTime() - lastBilledDate.getTime()) / (1000 * 60 * 60 * 24))
            shouldSuspend = daysOverdue > gracePeriodDays
          } else if (billing.billingAnniversaryDate) {
            // Calculate based on anniversary date
            const anniversaryDate = new Date(todayYear, todayMonth, billing.billingAnniversaryDate)
            if (anniversaryDate > today) {
              // Anniversary hasn't happened yet this month, use last month
              anniversaryDate.setMonth(anniversaryDate.getMonth() - 1)
            }
            daysOverdue = Math.floor((today.getTime() - anniversaryDate.getTime()) / (1000 * 60 * 60 * 24))
            shouldSuspend = daysOverdue > gracePeriodDays
          }
        } else if (billing.billingAnniversaryDate) {
          // Calculate based on billing anniversary date
          const anniversaryDate = new Date(todayYear, todayMonth, billing.billingAnniversaryDate)
          
          // If anniversary hasn't happened yet this month, use last month's anniversary
          if (anniversaryDate > today) {
            anniversaryDate.setMonth(anniversaryDate.getMonth() - 1)
          }
          
          // Check if last payment was after this anniversary
          const lastPaymentAfterAnniversary = billing.lastBilledAt 
            ? new Date(billing.lastBilledAt) >= anniversaryDate
            : false

          // If no payment after anniversary, calculate days overdue
          if (!lastPaymentAfterAnniversary) {
            daysOverdue = Math.floor((today.getTime() - anniversaryDate.getTime()) / (1000 * 60 * 60 * 24))
            shouldSuspend = daysOverdue > gracePeriodDays
          }
        }

        // Check if grace period has been exceeded
        if (shouldSuspend) {
          // Deactivate the organization
          await prisma.org.update({
            where: { id: billing.orgId },
            data: {
              status: 'DEACTIVATED',
              deactivatedAt: new Date(),
              deactivatedReason: `Account automatically deactivated due to overdue payment. Payment was ${daysOverdue} days overdue (grace period: ${gracePeriodDays} days). Last billed: ${lastBilledDate?.toLocaleDateString() || 'Never'}.`
            }
          })

          // Update subscription status
          await prisma.platformOrgBilling.update({
            where: { orgId: billing.orgId },
            data: {
              subscriptionStatus: 'past_due'
            }
          })

          // Create audit log
          await prisma.auditLog.create({
            data: {
              orgId: billing.orgId,
              action: 'ORG_AUTO_DEACTIVATED_OVERDUE',
              targetType: 'ORG',
              targetId: billing.orgId,
              data: JSON.stringify({
                orgName: billing.org.name,
                daysOverdue,
                gracePeriodDays,
                lastBilledAt: lastBilledDate?.toISOString(),
                subscriptionStatus: billing.subscriptionStatus
              })
            }
          })

          results.push({
            orgId: billing.orgId,
            orgName: billing.org.name,
            daysOverdue,
            status: 'deactivated'
          })
        }
      } catch (error: any) {
        logger.error(`Error processing overdue org ${billing.orgId}`, error)
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
      gracePeriodDays,
      retryPayments: {
        checked: orgsToRetry.length,
        retried: retryResults.length,
        succeeded: retryResults.filter(r => r.status === 'succeeded').length,
        failed: retryResults.filter(r => r.status === 'failed').length,
        results: retryResults
      },
      checkOverdue: {
        checked: overdueOrgs.length,
        deactivated: results.filter(r => r.status === 'deactivated').length,
        results
      }
    })
  } catch (error: any) {
    logger.error('Error in overdue check cron job', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to check overdue payments',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
async function handleGET(request: NextRequest) {
  try {
    const platformSettings = await getPlatformSettings()
    const gracePeriodDays = platformSettings?.gracePeriodDays || 14

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays)

    const overdueOrgs = await prisma.platformOrgBilling.findMany({
      where: {
        OR: [
          {
            subscriptionStatus: 'past_due',
            lastBilledAt: {
              lt: cutoffDate
            }
          },
          {
            lastBilledAt: {
              lt: cutoffDate
            },
            subscriptionStatus: {
              in: ['active', 'trialing']
            }
          }
        ],
        org: {
          status: 'ACTIVE',
          autoSuspendEnabled: true
        },
        billingAnniversaryDate: {
          not: null
        }
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({
      message: `Found ${overdueOrgs.length} organizations with overdue payments (grace period: ${gracePeriodDays} days)`,
      gracePeriodDays,
      cutoffDate: cutoffDate.toISOString(),
      orgs: overdueOrgs.map(b => ({
        orgId: b.orgId,
        orgName: b.org.name,
        lastBilledAt: b.lastBilledAt?.toISOString(),
        subscriptionStatus: b.subscriptionStatus,
        daysOverdue: b.lastBilledAt 
          ? Math.floor((today.getTime() - new Date(b.lastBilledAt).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
    })
  } catch (error: any) {
    logger.error('Error checking overdue', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to check overdue payments',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = handlePOST // Cron jobs don't need rate limiting, they're authenticated via secret
export const GET = handleGET

