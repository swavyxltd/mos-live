export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { sendAccountCancellationRequestEmail } from '@/lib/mail'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { reason } = await request.json()

    // Get organization details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: {
            role: { in: ['ADMIN', 'OWNER'] }
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

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update organization with cancellation request
    await prisma.org.update({
      where: { id: orgId },
      data: {
        cancellationRequestedAt: new Date(),
        cancellationReason: reason || 'User requested account cancellation'
      }
    })

    // Send email to support
    const adminEmail = org.memberships.find(m => m.role === 'ADMIN' || m.role === 'OWNER')?.user?.email || org.email
    await sendAccountCancellationRequestEmail({
      orgName: org.name,
      orgId: org.id,
      adminEmail: adminEmail || 'Unknown',
      adminName: org.memberships.find(m => m.role === 'ADMIN' || m.role === 'OWNER')?.user?.name || 'Unknown',
      reason: reason || 'User requested account cancellation'
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'CANCELLATION_REQUESTED',
        targetType: 'ORG',
        targetId: orgId,
        data: {
          orgName: org.name,
          reason: reason || 'User requested account cancellation'
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Cancellation request sent successfully' 
    })
  } catch (error) {
    console.error('Error processing cancellation request:', error)
    return NextResponse.json({ error: 'Failed to process cancellation request' }, { status: 500 })
  }
}

