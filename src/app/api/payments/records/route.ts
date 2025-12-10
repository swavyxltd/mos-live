export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET: Fetch payment records with filters
async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) {
      return session
    }
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) {
      return orgId
    }

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
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { paidAt: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(records)
  } catch (error: any) {
    logger.error('Error fetching payment records', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment records',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// PATCH: Update payment record (mark as paid, add notes, etc.)
async function handlePATCH(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { id, status, paidAt, notes, reference, method } = body

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
        Student: {
          include: {
            User: {
              select: {
                email: true,
                name: true
              }
            }
          }
        },
        Class: {
          select: {
            name: true
          }
        },
        Org: {
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
      currentRecord.Student.User?.email

    const updateData: any = {}
    if (status) updateData.status = status
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : new Date()
    if (notes !== undefined) updateData.notes = notes
    if (reference !== undefined) updateData.reference = reference
    if (method !== undefined) updateData.method = method

    const record = await prisma.monthlyPaymentRecord.update({
      where: { id, orgId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Send email notification if payment was marked as paid manually (cash/bank transfer)
    if (shouldSendEmail && currentRecord.Student.User) {
      try {
        const { sendPaymentConfirmationEmail } = await import('@/lib/mail')
        await sendPaymentConfirmationEmail({
          to: currentRecord.Student.User.email,
          orgName: currentRecord.Org.name,
          studentName: `${currentRecord.Student.firstName} ${currentRecord.Student.lastName}`,
          className: currentRecord.Class.name,
          month: currentRecord.month,
          amount: currentRecord.amountP,
          paymentMethod: currentRecord.method || 'Unknown',
          reference: reference || currentRecord.reference,
          paidAt: currentRecord.updatedAt || currentRecord.createdAt
        })
        logger.info('Payment confirmation email sent', {
          to: currentRecord.Student.User.email,
          studentId: currentRecord.Student.id
        })
      } catch (emailError: any) {
        logger.error('Error sending payment confirmation email', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(record)
  } catch (error: any) {
    logger.error('Error updating payment record', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update payment record',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PATCH = withRateLimit(handlePATCH)

