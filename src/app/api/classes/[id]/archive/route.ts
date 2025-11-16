export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(
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
  } catch (error: any) {
    logger.error('Archive class error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to archive class',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
