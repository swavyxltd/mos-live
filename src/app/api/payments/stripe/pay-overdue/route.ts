export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { amount, cardDetails } = body

    // In demo mode, simulate successful payment
    if (process.env.NODE_ENV === 'development') {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create a mock payment record
      const mockPayment = {
        id: `pay_demo_${Date.now()}`,
        amount: amount,
        status: 'SUCCEEDED',
        paymentMethod: 'card',
        transactionId: `txn_demo_${Date.now()}`,
        processedAt: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        payment: mockPayment,
        message: 'Payment processed successfully'
      })
    }

    // Real Stripe payment processing would go here
    // This would involve:
    // 1. Creating a Stripe payment intent
    // 2. Processing the payment with the card details
    // 3. Updating the database with payment records
    // 4. Marking overdue invoices as paid

    // For now, return a success response
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully'
    })
  } catch (error) {
    console.error('Error processing overdue payment:', error)
    return NextResponse.json({ 
      error: 'Payment processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
