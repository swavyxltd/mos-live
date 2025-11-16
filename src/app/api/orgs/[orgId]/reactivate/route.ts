export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const { orgId } = resolvedParams

    // Update organization status to ACTIVE
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'ACTIVE',
        deactivatedAt: null,
        deactivatedReason: null,
        pausedAt: null,
        pausedReason: null,
        paymentFailureCount: 0
      },
      include: {
        memberships: {
          where: {
            role: { in: ['ADMIN', 'STAFF'] }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId: orgId,
        actorUserId: session.user.id,
        action: 'ORG_REACTIVATED',
        targetType: 'ORG',
        targetId: orgId,
        data: JSON.stringify({
          orgName: updatedOrg.name,
          affectedUsers: updatedOrg.memberships.map(m => ({
            userId: m.user.id,
            userName: m.user.name,
            userEmail: m.user.email,
            role: m.role
          }))
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Organization ${updatedOrg.name} has been reactivated`,
      affectedUsers: updatedOrg.memberships.length
    })

  } catch (error: any) {
    logger.error('Error reactivating organization', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to reactivate organization',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
