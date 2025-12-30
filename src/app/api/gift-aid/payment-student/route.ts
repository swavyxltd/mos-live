export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    if (!parentId) {
      return NextResponse.json(
        { error: 'Parent ID is required' },
        { status: 400 }
      )
    }

    // Get the first student for this parent
    const student = await prisma.student.findFirst({
      where: {
        orgId,
        primaryParentId: parentId,
        isArchived: false
      },
      select: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found for this parent' },
        { status: 404 }
      )
    }

    return NextResponse.json({ studentId: student.id })
  } catch (error: any) {
    logger.error('Error fetching student from payment', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

