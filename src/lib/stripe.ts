import Stripe from 'stripe'
import { prisma } from './prisma'

export const stripe: Stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : (null as unknown as Stripe)

// Platform billing (metered)
export async function ensurePlatformCustomer(orgId: string) {
  const existing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })
  
  if (existing) {
    return existing
  }
  
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org) {
    throw new Error('Organization not found')
  }
  
  // Create Stripe customer
  const customer = await stripe.customers.create({
    name: org.name,
    metadata: {
      orgId,
      type: 'platform'
    }
  })
  
  // Create subscription with metered pricing
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{
      price: process.env.STRIPE_PRICE_ID!,
    }],
    metadata: {
      orgId,
      type: 'platform'
    }
  })
  
  const subscriptionItem = subscription.items.data[0]
  
  return prisma.platformOrgBilling.create({
    data: {
      orgId,
      stripeCustomerId: customer.id,
      stripeSubscriptionItemId: subscriptionItem.id,
    }
  })
}

// Parent billing
export async function ensureParentCustomer(orgId: string, parentUserId: string) {
  const existing = await prisma.parentBillingProfile.findUnique({
    where: {
      orgId_parentUserId: {
        orgId,
        parentUserId
      }
    }
  })
  
  if (existing?.stripeCustomerId) {
    return existing
  }
  
  const parent = await prisma.user.findUnique({
    where: { id: parentUserId }
  })
  
  if (!parent) {
    throw new Error('Parent not found')
  }
  
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org) {
    throw new Error('Organization not found')
  }
  
  // Create Stripe customer
  const customer = await stripe.customers.create({
    email: parent.email,
    name: parent.name || undefined,
    metadata: {
      orgId,
      parentUserId,
      type: 'parent'
    }
  })
  
  return prisma.parentBillingProfile.upsert({
    where: {
      orgId_parentUserId: {
        orgId,
        parentUserId
      }
    },
    update: {
      stripeCustomerId: customer.id,
    },
    create: {
      orgId,
      parentUserId,
      stripeCustomerId: customer.id,
    }
  })
}

export async function reportUsage(orgId: string, activeStudentCount: number) {
  const billing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })
  
  if (!billing) {
    throw new Error('Platform billing not found')
  }
  
  const timestamp = Math.floor(Date.now() / 1000)
  
  await stripe.subscriptionItems.createUsageRecord(
    billing.stripeSubscriptionItemId,
    {
      quantity: activeStudentCount,
      timestamp,
      action: 'set'
    }
  )
  
  await prisma.platformOrgBilling.update({
    where: { id: billing.id },
    data: {
      lastUsageReportedAt: new Date()
    }
  })
}

export async function createPaymentIntent(orgId: string, parentUserId: string, amountP: number, invoiceId: string) {
  const profile = await ensureParentCustomer(orgId, parentUserId)
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountP,
    currency: 'gbp',
    customer: profile.stripeCustomerId!,
    setup_future_usage: 'off_session',
    metadata: {
      orgId,
      parentUserId,
      invoiceId
    }
  })
  
  // Create pending payment record
  await prisma.payment.create({
    data: {
      orgId,
      invoiceId,
      method: 'CARD',
      amountP,
      status: 'PENDING',
      providerId: paymentIntent.id,
    }
  })
  
  return paymentIntent
}

export async function createSetupIntent(orgId: string, parentUserId: string) {
  const profile = await ensureParentCustomer(orgId, parentUserId)
  
  return stripe.setupIntents.create({
    customer: profile.stripeCustomerId!,
    usage: 'off_session',
    metadata: {
      orgId,
      parentUserId
    }
  })
}

export async function attemptOffSessionPayment(orgId: string, parentUserId: string, invoiceId: string, amountP: number) {
  const profile = await prisma.parentBillingProfile.findUnique({
    where: {
      orgId_parentUserId: {
        orgId,
        parentUserId
      }
    }
  })
  
  if (!profile?.stripeCustomerId || !profile.defaultPaymentMethodId || !profile.autoPayEnabled) {
    return null
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountP,
      currency: 'gbp',
      customer: profile.stripeCustomerId,
      payment_method: profile.defaultPaymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        orgId,
        parentUserId,
        invoiceId
      }
    })
    
    return paymentIntent
  } catch (error) {
    console.error('Off-session payment failed:', error)
    return null
  }
}
