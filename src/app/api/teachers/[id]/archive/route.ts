export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 })
    }
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
        id: crypto.randomUUID(),
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
  } catch (error: any) {
    logger.error('Archive teacher error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to archive teacher',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
