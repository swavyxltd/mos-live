export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePlatformSubscription, getActiveStudentCount } from '@/lib/stripe'
import { logger } from '@/lib/logger'

// This endpoint should be called daily via cron job
// It checks for orgs whose billing anniversary is tomorrow
// On the day before anniversary, it counts students and updates subscription
async function handlePOST(request: NextRequest) {
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
    // Only bill ACTIVE organisations (skip SUSPENDED/PAUSED)
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
          status: 'ACTIVE' // Only bill active organisations
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
        
        logger.info('Processing billing for org', {
          orgId: billing.orgId,
          orgName: billing.org.name,
          studentCount,
          anniversaryDate: billing.billingAnniversaryDate
        })

        if (billing.stripeSubscriptionId) {
          // Update existing subscription quantity
          await updatePlatformSubscription(billing.orgId, studentCount)
          
          results.push({
            orgId: billing.orgId,
            orgName: billing.org.name,
            studentCount,
            status: 'updated',
            expectedAmount: `£${(studentCount * 2).toFixed(2)}` // Assuming £2 per student
          })
        } else {
          // Create subscription if it doesn't exist (shouldn't happen, but just in case)
          const { createPlatformSubscription } = await import('@/lib/stripe')
          await createPlatformSubscription(billing.orgId, studentCount)
          
          results.push({
            orgId: billing.orgId,
            orgName: billing.org.name,
            studentCount,
            status: 'created',
            expectedAmount: `£${(studentCount * 2).toFixed(2)}` // Assuming £2 per student
          })
        }
      } catch (error: any) {
        logger.error(`Error processing billing for org ${billing.orgId}`, error)
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
      processed: results.length,
      results
    })
  } catch (error: any) {
    logger.error('Error in billing cron job', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to process billing',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
async function handleGET(request: NextRequest) {
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
        status: 'ACTIVE' // Only bill active organisations
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

export const POST = handlePOST // Cron jobs don't need rate limiting, they're authenticated via secret
export const GET = handleGET

