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
    
    // Update class
    const classData = await prisma.class.update({
      where: {
        id,
        orgId
      },
      data: {
        isArchived,
        archivedAt
      },
      include: {
        teacher: true,
        studentClasses: {
          include: {
            student: true
          }
        }
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: isArchived ? 'CLASS_ARCHIVED' : 'CLASS_UNARCHIVED',
        targetType: 'Class',
        targetId: id,
        data: {
          className: classData.name,
          action,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      class: classData,
      message: `Class ${isArchived ? 'archived' : 'unarchived'} successfully`
    })
  } catch (error) {
    console.error('Archive class error:', error)
    return NextResponse.json({ error: 'Failed to archive class' }, { status: 500 })
  }
}
