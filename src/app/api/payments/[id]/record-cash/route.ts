export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

const recordCashSchema = z.object({
  amountP: z.number().positive(),
  method: z.enum(['CASH', 'DIRECT_DEBIT']),
  notes: z.string().optional()
})

async function handlePOST(
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
    
    // Sanitize notes if provided
    const sanitizedNotes = notes ? sanitizeText(notes, MAX_STRING_LENGTHS.text) : undefined
    
    const invoiceId = params.id
    
    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { Student: true }
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
        id: crypto.randomUUID(),
        orgId,
        invoiceId,
        method,
        updatedAt: new Date()
        amountP,
        status: 'SUCCEEDED',
        providerId: `${method.toLowerCase()}_${Date.now()}`,
        meta: { notes: sanitizedNotes }
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
          studentName: `${invoice.Student.firstName} ${invoice.Student.lastName}`
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
  } catch (error: any) {
    logger.error('Record cash payment error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to record cash payment',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
