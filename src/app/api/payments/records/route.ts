export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

// GET: Fetch payment records with filters
export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/payments/records - Starting request')
    
    if (!requireRole || typeof requireRole !== 'function') {
      console.error('[API] requireRole is not a function:', typeof requireRole)
      return NextResponse.json({ error: 'Internal server error: requireRole not available' }, { status: 500 })
    }
    
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) {
      console.log('[API] Session check failed:', session.status)
      return session
    }

    console.log('[API] Session validated, user:', session.user?.email)
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) {
      console.log('[API] Org check failed:', orgId.status)
      return orgId
    }
    
    console.log('[API] Org ID:', orgId)

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

    console.log(`[API] Found ${records.length} payment records for org ${orgId}`)
    console.log(`[API] Records:`, records.map(r => ({ id: r.id, month: r.month, status: r.status, student: `${r.student.firstName} ${r.student.lastName}` })))

    return NextResponse.json(records)
  } catch (error: any) {
    console.error('[API] ❌ Error fetching payment records:', error)
    console.error('[API] Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Unknown',
      cause: error?.cause || 'No cause'
    })
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch payment records',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          name: error?.name
        } : undefined
      },
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

    // Get the current record to check if status is changing to PAID
    const currentRecord = await prisma.monthlyPaymentRecord.findUnique({
      where: { id, orgId },
      include: {
        student: {
          include: {
            primaryParent: {
              select: {
                email: true,
                name: true
              }
            }
          }
        },
        class: {
          select: {
            name: true
          }
        },
        org: {
          select: {
            name: true
          }
        }
      }
    })

    if (!currentRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    const wasPending = currentRecord.status === 'PENDING'
    const isBeingMarkedPaid = status === 'PAID' && wasPending
    const shouldSendEmail = isBeingMarkedPaid && 
      (currentRecord.method === 'CASH' || currentRecord.method === 'BANK_TRANSFER') &&
      currentRecord.student.primaryParent?.email

    const updateData: any = {}
    if (status) updateData.status = status
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : new Date()
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

    // Send email notification if payment was marked as paid manually (cash/bank transfer)
    if (shouldSendEmail && currentRecord.student.primaryParent) {
      try {
        const { sendPaymentConfirmationEmail } = await import('@/lib/mail')
        await sendPaymentConfirmationEmail({
          to: currentRecord.student.primaryParent.email,
          orgName: currentRecord.org.name,
          studentName: `${currentRecord.student.firstName} ${currentRecord.student.lastName}`,
          className: currentRecord.class.name,
          month: currentRecord.month,
          amount: currentRecord.amountP,
          paymentMethod: currentRecord.method || 'Unknown',
          reference: reference || currentRecord.reference
        })
        console.log(`✅ Payment confirmation email sent to ${currentRecord.student.primaryParent.email}`)
      } catch (emailError) {
        console.error('Error sending payment confirmation email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(record)
  } catch (error: any) {
    console.error('Error updating payment record:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment record' },
      { status: 500 }
    )
  }
}

