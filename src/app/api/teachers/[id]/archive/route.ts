import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const { id } = params
    const { action } = await request.json() // 'archive' or 'unarchive'
    
    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const isArchived = action === 'archive'
    const archivedAt = isArchived ? new Date() : null
    
    // Update teacher
    const teacher = await prisma.user.update({
      where: {
        id
      },
      data: {
        isArchived,
        archivedAt
      },
      include: {
        memberships: {
          where: {
            orgId
          }
        },
        classes: {
          where: {
            orgId
          }
        }
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: isArchived ? 'STAFF_ARCHIVED' : 'STAFF_UNARCHIVED',
        targetType: 'Teacher',
        targetId: id,
        data: {
          teacherName: teacher.name,
          action,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      teacher,
      message: `Teacher ${isArchived ? 'archived' : 'unarchived'} successfully`
    })
  } catch (error) {
    console.error('Archive teacher error:', error)
    return NextResponse.json({ error: 'Failed to archive teacher' }, { status: 500 })
  }
}
