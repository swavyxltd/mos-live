export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
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

    const { reason } = await request.json()
    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const { orgId } = resolvedParams

    // Sanitize reason
    const sanitizedReason = reason ? sanitizeText(reason, MAX_STRING_LENGTHS.text) : 'Account paused by platform administrator'

    // Update organization status to PAUSED
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedReason: sanitizedReason
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
        action: 'ORG_PAUSED',
        targetType: 'ORG',
        targetId: orgId,
        data: JSON.stringify({
          orgName: updatedOrg.name,
          reason: sanitizedReason,
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
      message: `Organization ${updatedOrg.name} has been paused`,
      affectedUsers: updatedOrg.memberships.length
    })

  } catch (error: any) {
    logger.error('Error pausing organization', error)
    
    // Check if it's a Prisma field error
    if (error?.code === 'P2002' || error?.message?.includes('Unknown column') || error?.message?.includes('column') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Database schema error. Please run migrations to add pausedAt and pausedReason fields.',
        ...(process.env.NODE_ENV === 'development' && { details: error?.message })
      }, { status: 500 })
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json({ 
      error: 'Failed to pause organization',
      ...(isDevelopment && { details: error?.message })
    }, { status: 500 })
  }
}

export const POST = withRateLimit(handlePOST)
