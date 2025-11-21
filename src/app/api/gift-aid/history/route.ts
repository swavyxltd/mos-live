export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    let submissionData: any[] = []
    
    try {
      // Get all submissions for this org, ordered by most recent first
      const submissions = await prisma.giftAidSubmission.findMany({
        where: {
          orgId
        },
        include: {
          GeneratedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      submissionData = submissions.map(sub => ({
        id: sub.id,
        startDate: sub.startDate,
        endDate: sub.endDate,
        totalAmount: sub.totalAmount,
        totalCount: sub.totalCount,
        filename: sub.filename,
        createdAt: sub.createdAt,
        generatedBy: {
          name: sub.GeneratedBy?.name || 'Unknown',
          email: sub.GeneratedBy?.email || 'unknown@example.com'
        }
      }))
    } catch (dbError) {
      // If database query fails, log but continue
      logger.error('Database query failed for gift aid history', dbError)
    }
    
    // Demo data is now in the database, so we don't need to generate it here
    // If no data exists, return empty array
    
    return NextResponse.json({
      data: submissionData,
      total: submissionData.length
    })
  } catch (error: any) {
    logger.error('Get gift aid history error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch gift aid history',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

