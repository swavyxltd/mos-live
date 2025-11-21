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

    // Get all Gift Aid submissions for this org
    const submissions = await prisma.giftAidSubmission.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate total claimed
    const totalClaimed = submissions.reduce((sum, sub) => sum + (sub.totalAmount * 0.25), 0)

    // Get parent counts by status
    const parentMemberships = await prisma.userOrgMembership.findMany({
      where: {
        orgId,
        role: 'PARENT'
      },
      select: {
        userId: true
      }
    })

    const parentUserIds = parentMemberships.map(m => m.userId)

    if (parentUserIds.length === 0) {
      return NextResponse.json({
        totalClaimed: 0,
        activeParents: 0,
        pendingParents: 0,
        declinedParents: 0,
        potentialValue: 0
      })
    }

    const [activeParents, pendingParents, declinedParents] = await Promise.all([
      prisma.user.count({
        where: {
          id: { in: parentUserIds },
          giftAidStatus: 'YES'
        }
      }),
      prisma.user.count({
        where: {
          id: { in: parentUserIds },
          giftAidStatus: 'NOT_SURE'
        }
      }),
      prisma.user.count({
        where: {
          id: { in: parentUserIds },
          giftAidStatus: 'NO'
        }
      })
    ])

    // Calculate potential value from pending parents
    // Get payments from pending parents in the last 12 months
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const pendingParentUsers = await prisma.user.findMany({
      where: {
        id: { in: parentUserIds },
        giftAidStatus: 'NOT_SURE'
      },
      select: { id: true }
    })

    const pendingParentIds = pendingParentUsers.map(u => u.id)

    let potentialValue = 0
    if (pendingParentIds.length > 0) {
      const pendingPayments = await prisma.payment.findMany({
        where: {
          orgId,
          status: 'SUCCEEDED',
          createdAt: { gte: oneYearAgo },
          Invoice: {
            Student: {
              primaryParentId: { in: pendingParentIds }
            }
          }
        },
        select: {
          amountP: true
        }
      })

      const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amountP / 100), 0)
      potentialValue = totalPendingAmount * 0.25
    }

    return NextResponse.json({
      totalClaimed,
      activeParents,
      pendingParents,
      declinedParents,
      potentialValue,
      totalSubmissions: submissions.length
    })
  } catch (error: any) {
    logger.error('Get gift aid analytics error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

