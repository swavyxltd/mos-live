import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { createPaymentIntent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

const payNowSchema = z.object({
  invoiceId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const body = await request.json()
    const { invoiceId } = payNowSchema.parse(body)
    
    // Get invoice and verify it belongs to parent's student
    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: invoiceId, 
        orgId,
        student: {
          primaryParentId: session.user.id
        }
      },
      include: {
        student: true
      }
    })
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }
    
    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      orgId,
      session.user.id,
      invoice.amountP,
      invoiceId
    )
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret
    })
  } catch (error) {
    console.error('Pay now error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
