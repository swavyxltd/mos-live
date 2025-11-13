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

    const { reason } = await request.json()
    const { orgId } = params

    // Update organization status to SUSPENDED
    const updatedOrg = await prisma.org.update({
      where: { id: orgId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedReason: reason || 'Account suspended by platform administrator'
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
        action: 'ORG_SUSPENDED',
        entityType: 'ORG',
        entityId: orgId,
        userId: session.user.id,
        details: {
          orgName: updatedOrg.name,
          reason: reason || 'Account suspended by platform administrator',
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
      message: `Organization ${updatedOrg.name} has been suspended`,
      affectedUsers: updatedOrg.memberships.length
    })

  } catch (error) {
    console.error('Error suspending organization:', error)
    return NextResponse.json({ error: 'Failed to suspend organization' }, { status: 500 })
  }
}
