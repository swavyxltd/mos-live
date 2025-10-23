import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reason } = await request.json()
    const { orgId } = params

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
        action: 'ORG_PAUSED',
        entityType: 'ORG',
        entityId: orgId,
        userId: session.user.id,
        details: {
          orgName: updatedOrg.name,
          reason: reason || 'Account paused by platform administrator',
          affectedUsers: updatedOrg.memberships.map(m => ({
            userId: m.user.id,
            userName: m.user.name,
            userEmail: m.user.email,
            role: m.role
          }))
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Organization ${updatedOrg.name} has been paused`,
      affectedUsers: updatedOrg.memberships.length
    })

  } catch (error) {
    console.error('Error pausing organization:', error)
    return NextResponse.json({ error: 'Failed to pause organization' }, { status: 500 })
  }
}
