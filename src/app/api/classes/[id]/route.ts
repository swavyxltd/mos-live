export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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
    console.error('Update class error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update class' },
      { status: 500 }
    )
  }
}

