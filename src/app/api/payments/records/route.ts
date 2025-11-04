export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// GET: Fetch payment records with filters
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const classId = searchParams.get('classId')
    const method = searchParams.get('method')
    const status = searchParams.get('status')

    const where: any = { orgId }

    if (month) where.month = month
    if (classId) where.classId = classId
    if (method) where.method = method
    if (status) where.status = status

    const records = await prisma.monthlyPaymentRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(records)
  } catch (error: any) {
    console.error('Error fetching payment records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment records' },
      { status: 500 }
    )
  }
}

// PATCH: Update payment record (mark as paid, add notes, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { id, status, paidAt, notes, reference } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Payment record ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (notes !== undefined) updateData.notes = notes
    if (reference !== undefined) updateData.reference = reference

    const record = await prisma.monthlyPaymentRecord.update({
      where: { id, orgId },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(record)
  } catch (error: any) {
    console.error('Error updating payment record:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment record' },
      { status: 500 }
    )
  }
}

