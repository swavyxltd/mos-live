export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = params

    // Update organization status to ACTIVE
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedReason: null,
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

  } catch (error) {
    console.error('Error reactivating organization:', error)
    return NextResponse.json({ error: 'Failed to reactivate organization' }, { status: 500 })
  }
}
