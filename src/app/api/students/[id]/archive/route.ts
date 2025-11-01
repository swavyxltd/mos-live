export const runtime = 'nodejs'
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
    const { isArchived } = await request.json()
    
    const archivedAt = isArchived ? new Date() : null
    
    // Update student
    const student = await prisma.student.update({
      where: {
        id,
        orgId
      },
      data: {
        isArchived,
        archivedAt
      },
      include: {
        primaryParent: true,
        studentClasses: {
          include: {
            class: true
          }
        }
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: isArchived ? 'ARCHIVE' : 'UNARCHIVE',
        targetType: 'STUDENT',
        targetId: id,
        data: {
          studentName: `${student.firstName} ${student.lastName}`,
          isArchived,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    return NextResponse.json(student)
  } catch (error) {
    console.error('Archive student error:', error)
    return NextResponse.json({ error: 'Failed to archive student' }, { status: 500 })
  }
}
