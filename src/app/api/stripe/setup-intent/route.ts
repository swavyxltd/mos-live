export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Create or get Stripe customer
    let customerId: string
    
    // Check if user already has a Stripe customer ID
    const existingCustomer = await stripe.customers.list({
      email: session.user.email,
      limit: 1
    })

    if (existingCustomer.data.length > 0) {
      customerId = existingCustomer.data[0].id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
          orgId: org.id
        }
      })
      customerId = customer.id
    }

    // Create setup intent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        userId: session.user.id,
        orgId: org.id
      }
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId
    })
  } catch (error: any) {
    logger.error('Error creating Stripe setup intent', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create setup intent',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
