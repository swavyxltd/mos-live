import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reportUsage } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (in production, you'd verify the request source)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting nightly usage report...')

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
        const activeStudentCount = org._count.students
        await reportUsage(org.id, activeStudentCount)
        
        console.log(`Reported usage for ${org.name}: ${activeStudentCount} students`)
        successCount++
      } catch (error) {
        console.error(`Failed to report usage for ${org.name}:`, error)
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

    console.log(`Nightly usage report completed: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      totalOrgs: orgsWithBilling.length,
      successCount,
      failureCount
    })
  } catch (error) {
    console.error('Nightly usage report error:', error)
    return NextResponse.json(
      { error: 'Failed to process nightly usage report' },
      { status: 500 }
    )
  }
}
