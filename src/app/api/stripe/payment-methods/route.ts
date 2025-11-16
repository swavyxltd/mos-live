export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/roles'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get parent billing profile
    const billingProfile = await prisma.parentBillingProfile.findUnique({
      where: {
        orgId_parentUserId: {
          orgId: org.id,
          parentUserId: session.user.id
        }
      }
    })

    if (!billingProfile?.stripeCustomerId) {
      // Return demo payment methods for demonstration
      return NextResponse.json({ 
        paymentMethods: [
          {
            id: 'pm_demo_visa',
            type: 'card',
            last4: '4242',
            brand: 'visa',
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true
          },
          {
            id: 'pm_demo_mastercard',
            type: 'card',
            last4: '5555',
            brand: 'mastercard',
            expiryMonth: 8,
            expiryYear: 2026,
            isDefault: false
          }
        ]
      })
    }

    // Get payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: billingProfile.stripeCustomerId,
      type: 'card'
    })

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        last4: pm.card?.last4,
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === billingProfile.defaultPaymentMethodId
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching payment methods', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment methods',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { paymentMethodId } = body

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      )
    }

    // Get parent billing profile
    const billingProfile = await prisma.parentBillingProfile.findUnique({
      where: {
        orgId_parentUserId: {
          orgId: org.id,
          parentUserId: session.user.id
        }
      }
    })

    if (!billingProfile?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing profile found' }, { status: 404 })
    }

    // Detach payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId)

    // Update billing profile if this was the default payment method
    if (billingProfile.defaultPaymentMethodId === paymentMethodId) {
      await prisma.parentBillingProfile.update({
        where: { id: billingProfile.id },
        data: {
          defaultPaymentMethodId: null,
          autoPayEnabled: false
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error deleting payment method', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to delete payment method',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const DELETE = withRateLimit(handleDELETE)
