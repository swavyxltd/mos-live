export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { hasPlatformPaymentMethod, createPlatformSetupIntent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET: Check if org has payment method on file
async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner accounts don't need payment checks
    if (session.user.isSuperAdmin) {
      return NextResponse.json({
        hasPaymentMethod: true,
        paymentMethodId: null,
        paymentMethods: []
      })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: org.id }
    })

    if (!billing) {
      return NextResponse.json({
        hasPaymentMethod: false,
        paymentMethodId: null,
        paymentMethods: []
      })
    }

    // Fetch payment methods from Stripe
    let paymentMethods: any[] = []
    let hasPaymentMethod = !!billing.defaultPaymentMethodId
    let actualPaymentMethodId = billing.defaultPaymentMethodId
    
    if (billing.stripeCustomerId) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: billing.stripeCustomerId,
          type: 'card'
        })
        paymentMethods = methods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: {
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year
          },
          isDefault: pm.id === billing.defaultPaymentMethodId
        }))
        
        // If we have payment methods in Stripe but no defaultPaymentMethodId in DB, use the first one
        if (paymentMethods.length > 0 && !billing.defaultPaymentMethodId) {
          // Update database with the first payment method
          const firstMethod = paymentMethods[0]
          actualPaymentMethodId = firstMethod.id
          hasPaymentMethod = true
          
          // Update database to sync with Stripe
          await prisma.platformOrgBilling.update({
            where: { orgId: org.id },
            data: {
              defaultPaymentMethodId: firstMethod.id
            }
          })
          
          // Also set as default in Stripe if not already
          try {
            await stripe.customers.update(billing.stripeCustomerId, {
              invoice_settings: {
                default_payment_method: firstMethod.id
              }
            })
          } catch (stripeError: any) {
            logger.error('Error setting default payment method in Stripe', stripeError)
          }
        }
      } catch (error: any) {
        logger.error('Error fetching payment methods', error)
      }
    }

    return NextResponse.json({
      hasPaymentMethod,
      paymentMethodId: actualPaymentMethodId,
      paymentMethods,
      subscriptionStatus: billing.subscriptionStatus,
      trialEndDate: billing.trialEndDate?.toISOString() || null,
      billingAnniversaryDate: billing.billingAnniversaryDate
    })
  } catch (error: any) {
    logger.error('Error fetching platform payment settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// POST: Create setup intent for adding payment method
async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only org admins can add payment methods
    if (session.user.isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Owner accounts do not require payment methods' 
      }, { status: 400 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Create setup intent
    const setupIntent = await createPlatformSetupIntent(org.id)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    })
  } catch (error: any) {
    logger.error('Error creating setup intent', error)
    
    // Return more specific error message
    const errorMessage = error?.message || 'Failed to create setup intent'
    
    // Check if it's a Stripe connection error
    if (errorMessage.includes('connection') || errorMessage.includes('retried')) {
      return NextResponse.json(
        { 
          error: 'Unable to connect to Stripe. Please check your internet connection and try again. If the problem persists, check your Stripe API key configuration.',
          ...(process.env.NODE_ENV === 'development' && { details: error?.type || error?.code }),
          retryable: true
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(isDevelopment && { details: error?.type || error?.code })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

