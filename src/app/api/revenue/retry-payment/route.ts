import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, organizationId } = await request.json()

    if (!paymentIntentId || !organizationId) {
      return NextResponse.json(
        { error: 'Payment Intent ID and Organization ID are required' },
        { status: 400 }
      )
    }

    // For demo purposes, we'll simulate different outcomes
    // In production, you would:
    // 1. Get the organization's saved payment method
    // 2. Retry the payment intent with that method
    // 3. Handle the result appropriately

    if (paymentIntentId === 'pi_demo_001') {
      // Simulate successful retry for Birmingham Quran Academy
      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntentId,
          status: 'succeeded',
          amount: 9800, // £98.00 in pence
          currency: 'gbp',
        }
      })
    } else if (paymentIntentId === 'pi_demo_002') {
      // Simulate failed retry for Leeds Islamic School
      return NextResponse.json({
        success: false,
        error: 'Card declined',
        paymentIntent: {
          id: paymentIntentId,
          status: 'requires_payment_method',
          last_payment_error: {
            message: 'Your card was declined.',
            type: 'card_error',
            code: 'card_declined'
          }
        }
      })
    } else {
      // Simulate successful retry for others
      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntentId,
          status: 'succeeded',
          amount: 4500, // £45.00 in pence
          currency: 'gbp',
        }
      })
    }

    // Real Stripe implementation would look like this:
    /*
    // Get the organization's customer and default payment method
    const customer = await stripe.customers.retrieve(organizationId)
    const paymentMethods = await stripe.paymentMethods.list({
      customer: organizationId,
      type: 'card',
    })
    
    if (paymentMethods.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No payment method found for this organization'
      })
    }

    // Retry the payment intent with the organization's default payment method
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethods.data[0].id,
    })

    if (paymentIntent.status === 'succeeded') {
      // Update your database to mark payment as successful
      // await updatePaymentStatus(paymentIntentId, 'succeeded')
      
      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Payment retry failed',
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          last_payment_error: paymentIntent.last_payment_error,
        }
      })
    }
    */

  } catch (error: any) {
    console.error('Stripe payment retry error:', error)
    
    return NextResponse.json(
      { 
        error: 'Payment retry failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}