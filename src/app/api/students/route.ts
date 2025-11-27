export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/students - Get all students for the current org
async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const whereClause: any = {
      orgId,
      isArchived: false
    }

    if (status === 'ACTIVE') {
      whereClause.isArchived = false
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryParentId: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json(students)
  } catch (error: any) {
    logger.error('Error fetching students', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch students',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

