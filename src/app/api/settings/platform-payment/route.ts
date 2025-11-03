export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { hasPlatformPaymentMethod, createPlatformSetupIntent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// GET: Check if org has payment method on file
export async function GET() {
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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
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
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      }
    }

    return NextResponse.json({
      hasPaymentMethod: !!billing.defaultPaymentMethodId,
      paymentMethodId: billing.defaultPaymentMethodId,
      paymentMethods,
      subscriptionStatus: billing.subscriptionStatus,
      trialEndDate: billing.trialEndDate?.toISOString() || null,
      billingAnniversaryDate: billing.billingAnniversaryDate
    })
  } catch (error) {
    console.error('Error fetching platform payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment settings' },
      { status: 500 }
    )
  }
}

// POST: Create setup intent for adding payment method
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Create setup intent
    const setupIntent = await createPlatformSetupIntent(org.id)

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    })
  } catch (error: any) {
    console.error('Error creating setup intent:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      type: error?.type,
      code: error?.code
    })
    
    // Return more specific error message
    const errorMessage = error?.message || 'Failed to create setup intent'
    return NextResponse.json(
      { error: errorMessage, details: error?.type || error?.code },
      { status: 500 }
    )
  }
}

