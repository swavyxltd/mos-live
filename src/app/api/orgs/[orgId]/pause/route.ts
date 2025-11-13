export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Update organization status to PAUSED
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pausedReason: reason || 'Account paused by platform administrator'
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
          reason: reason || 'Account paused by platform administrator',
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
    console.error('Error pausing organization:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json({ 
      error: 'Failed to pause organization',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}
