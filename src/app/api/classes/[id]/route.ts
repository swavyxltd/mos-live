export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { monthlyFeeP, feeDueDay } = body

    // Verify class belongs to org
    const existingClass = await prisma.class.findFirst({
      where: {
        id: params.id,
        orgId: orgId
      }
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (feeDueDay !== undefined && (feeDueDay < 1 || feeDueDay > 31)) {
      return NextResponse.json(
        { error: 'Fee due day must be between 1 and 31' },
        { status: 400 }
      )
    }

    // Update class fee and due day
    const updatedClass = await prisma.class.update({
      where: { id: params.id },
      data: {
        monthlyFeeP: monthlyFeeP !== undefined ? Math.round(monthlyFeeP * 100) : undefined,
        feeDueDay: feeDueDay !== undefined ? feeDueDay : undefined
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            studentClasses: true
          }
        }
      }
    })

    return NextResponse.json(updatedClass)
  } catch (error: any) {
    logger.error('Update class error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update class',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PATCH = withRateLimit(handlePATCH)

