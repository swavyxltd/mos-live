import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

const recordCashSchema = z.object({
  amountP: z.number().positive(),
  method: z.enum(['CASH', 'DIRECT_DEBIT']),
  notes: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const body = await request.json()
    const { amountP, method, notes } = recordCashSchema.parse(body)
    
    const invoiceId = params.id
    
    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { student: true }
    })
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }
    
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orgId,
        invoiceId,
        method,
        amountP,
        status: 'SUCCEEDED',
        providerId: `${method.toLowerCase()}_${Date.now()}`,
        meta: { notes }
      }
    })
    
    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidMethod: method
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'RECORD_CASH_PAYMENT',
        targetType: 'Payment',
        targetId: payment.id,
        data: {
          invoiceId,
          amount: amountP,
          studentName: `${invoice.student.firstName} ${invoice.student.lastName}`
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      payment: {
        id: payment.id,
        amount: payment.amountP,
        method: payment.method,
        status: payment.status
      },
      invoice: {
        id: updatedInvoice.id,
        status: updatedInvoice.status,
        paidAt: updatedInvoice.paidAt
      }
    })
  } catch (error) {
    console.error('Record cash payment error:', error)
    return NextResponse.json(
      { error: 'Failed to record cash payment' },
      { status: 500 }
    )
  }
}
