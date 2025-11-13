export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePlatformSubscription, getActiveStudentCount } from '@/lib/stripe'

// This endpoint should be called daily via cron job
// It checks for orgs whose billing anniversary is tomorrow
// On the day before anniversary, it counts students and updates subscription
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    // Vercel cron jobs automatically add authorization header
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Also allow Vercel cron header verification
    const vercelCron = request.headers.get('x-vercel-cron')
    if (!vercelCron && cronSecret && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDate()

    // Find all orgs with billing anniversary tomorrow
    // Only bill ACTIVE organizations (skip SUSPENDED/PAUSED)
    const orgsToBill = await prisma.platformOrgBilling.findMany({
      where: {
        billingAnniversaryDate: tomorrowDay,
        subscriptionStatus: {
          in: ['active', 'trialing']
        },
        defaultPaymentMethodId: {
          not: null
        },
        org: {
          status: 'ACTIVE' // Only bill active organizations
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

    const results = []

    for (const billing of orgsToBill) {
      try {
        // Count active students on the day before anniversary
        const studentCount = await getActiveStudentCount(billing.orgId)

        if (billing.stripeSubscriptionId) {
          // Update existing subscription quantity
          await updatePlatformSubscription(billing.orgId, studentCount)
          
          results.push({
            orgId: billing.orgId,
            orgName: billing.org.name,
            studentCount,
            status: 'updated'
          })
        } else {
          // Create subscription if it doesn't exist (shouldn't happen, but just in case)
          const { createPlatformSubscription } = await import('@/lib/stripe')
          await createPlatformSubscription(billing.orgId, studentCount)
          
          results.push({
            orgId: billing.orgId,
            orgName: billing.org.name,
            studentCount,
            status: 'created'
          })
        }
      } catch (error) {
        console.error(`Error processing billing for org ${billing.orgId}:`, error)
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
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Error in billing cron job:', error)
    return NextResponse.json(
      { error: 'Failed to process billing' },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay = tomorrow.getDate()

  const orgsToBill = await prisma.platformOrgBilling.findMany({
    where: {
      billingAnniversaryDate: tomorrowDay,
      subscriptionStatus: {
        in: ['active', 'trialing']
      },
      defaultPaymentMethodId: {
        not: null
      },
      org: {
        status: 'ACTIVE' // Only bill active organizations
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
    message: `Found ${orgsToBill.length} orgs to bill tomorrow (day ${tomorrowDay})`,
    orgs: orgsToBill.map(b => ({
      orgId: b.orgId,
      orgName: b.org.name,
      anniversaryDate: b.billingAnniversaryDate,
      subscriptionStatus: b.subscriptionStatus
    }))
  })
}

