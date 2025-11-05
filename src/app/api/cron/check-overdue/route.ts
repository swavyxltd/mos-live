import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlatformSettings } from '@/lib/platform-settings'

// This endpoint should be called daily via cron job
// It checks for organizations with overdue payments beyond grace period and suspends them
export async function POST(request: NextRequest) {
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
    // 2. Status is ACTIVE (not already suspended)
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
            suspendedAt: true,
            suspendedReason: true
          }
        }
      }
    })

    const results = []

    for (const billing of overdueOrgs) {
      try {
        // Skip if already suspended
        if (billing.org.status === 'SUSPENDED') {
          continue
        }

        // Calculate days overdue based on billing anniversary
        let daysOverdue = 0
        let shouldSuspend = false

        if (billing.subscriptionStatus === 'past_due') {
          // If subscription is past_due, check lastBilledAt or use anniversary date
          if (billing.lastBilledAt) {
            const lastBilledDate = new Date(billing.lastBilledAt)
            daysOverdue = Math.floor((today.getTime() - lastBilledDate.getTime()) / (1000 * 60 * 60 * 24))
          } else if (billing.billingAnniversaryDate) {
            // Calculate based on anniversary date
            const anniversaryDate = new Date(todayYear, todayMonth, billing.billingAnniversaryDate)
            if (anniversaryDate > today) {
              // Anniversary hasn't happened yet this month, use last month
              anniversaryDate.setMonth(anniversaryDate.getMonth() - 1)
            }
            daysOverdue = Math.floor((today.getTime() - anniversaryDate.getTime()) / (1000 * 60 * 60 * 24))
          }
          
          // If past_due and grace period exceeded, suspend
          shouldSuspend = daysOverdue > gracePeriodDays
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
          // Suspend the organization
          await prisma.org.update({
            where: { id: billing.orgId },
            data: {
              status: 'SUSPENDED',
              suspendedAt: new Date(),
              suspendedReason: `Account automatically suspended due to overdue payment. Payment was ${daysOverdue} days overdue (grace period: ${gracePeriodDays} days). Last billed: ${lastBilledDate?.toLocaleDateString() || 'Never'}.`
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
              action: 'ORG_AUTO_SUSPENDED_OVERDUE',
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
            status: 'suspended'
          })
        }
      } catch (error) {
        console.error(`Error processing overdue org ${billing.orgId}:`, error)
        results.push({
          orgId: billing.orgId,
          orgName: billing.org.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      gracePeriodDays,
      checked: overdueOrgs.length,
      suspended: results.filter(r => r.status === 'suspended').length,
      results
    })
  } catch (error) {
    console.error('Error in overdue check cron job:', error)
    return NextResponse.json(
      { error: 'Failed to check overdue payments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
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
  } catch (error) {
    console.error('Error checking overdue:', error)
    return NextResponse.json(
      { error: 'Failed to check overdue payments' },
      { status: 500 }
    )
  }
}

