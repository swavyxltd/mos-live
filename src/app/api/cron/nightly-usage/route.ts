export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reportUsage } from '@/lib/stripe'
import { logger } from '@/lib/logger'

async function handlePOST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (in production, you'd verify the request source)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting nightly usage report...')

    // Get all organizations with platform billing
    const orgsWithBilling = await prisma.org.findMany({
      where: {
        platformBilling: {
          isNot: null
        }
      },
      include: {
        platformBilling: true,
        _count: {
          select: {
            students: true
          }
        }
      }
    })

    let successCount = 0
    let failureCount = 0

    for (const org of orgsWithBilling) {
      try {
        // Count only non-archived students for billing
        const activeStudentCount = await prisma.student.count({
          where: {
            orgId: org.id,
            isArchived: false
          }
        })
        await reportUsage(org.id, activeStudentCount)
        
        logger.info(`Reported usage for ${org.name}: ${activeStudentCount} students`)
        successCount++
      } catch (error) {
        logger.error(`Failed to report usage for ${org.name}`, error)
        failureCount++
      }
    }

    // Log the cron job execution
    await prisma.auditLog.create({
      data: {
        action: 'NIGHTLY_USAGE_REPORT',
        targetType: 'CronJob',
        data: {
          totalOrgs: orgsWithBilling.length,
          successCount,
          failureCount,
          timestamp: new Date().toISOString()
        }
      }
    })

    logger.info(`Nightly usage report completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      totalOrgs: orgsWithBilling.length,
      successCount,
      failureCount
    })
  } catch (error: any) {
    logger.error('Nightly usage report error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to process nightly usage report',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = handlePOST
