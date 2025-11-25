import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlatformSettings } from '@/lib/platform-settings'
import { logger } from '@/lib/logger'

// This endpoint should be called daily via cron job
// It checks for organizations with overdue payments beyond grace period and suspends them
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
      checked: overdueOrgs.length,
      deactivated: results.filter(r => r.status === 'deactivated').length,
      results
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

