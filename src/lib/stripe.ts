import Stripe from 'stripe'
import { prisma } from './prisma'

export const stripe: Stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      maxNetworkRetries: 2,
      timeout: 30000, // 30 seconds timeout
      httpClient: Stripe.createFetchHttpClient(),
    })
  : (null as unknown as Stripe)

// Platform billing - Create or get Stripe customer
export async function ensurePlatformCustomer(orgId: string) {
  const existing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })
  
  if (existing?.stripeCustomerId) {
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
  
  // Calculate billing anniversary date (day of month when org was created)
  const orgCreatedDate = org.createdAt
  const billingAnniversaryDate = orgCreatedDate.getDate()
  
  // Calculate trial end date (1 month from creation)
  const trialEndDate = new Date(orgCreatedDate)
  trialEndDate.setMonth(trialEndDate.getMonth() + 1)
  
  // Create or update billing record
  if (existing) {
    return prisma.platformOrgBilling.update({
      where: { orgId },
      data: {
        stripeCustomerId: customer.id,
        billingAnniversaryDate,
        trialEndDate,
        subscriptionStatus: 'trialing'
      }
    })
  }
  
  return prisma.platformOrgBilling.create({
    data: {
      orgId,
      stripeCustomerId: customer.id,
      billingAnniversaryDate,
      trialEndDate,
      subscriptionStatus: 'trialing'
    }
  })
}

// Create setup intent for platform org to add payment method
export async function createPlatformSetupIntent(orgId: string) {
  // Check if Stripe is initialized
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.')
  }

  // Validate API key format
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey || (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_'))) {
    throw new Error('Invalid Stripe API key format. Key must start with sk_live_ or sk_test_')
  }

  const billing = await ensurePlatformCustomer(orgId)
  
  if (!billing.stripeCustomerId) {
    throw new Error('Stripe customer not found')
  }
  
  try {
    // Test connection first by fetching customer
    try {
      await stripe.customers.retrieve(billing.stripeCustomerId)
    } catch (customerError: any) {
      throw new Error(`Cannot connect to Stripe customer: ${customerError.message}`)
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: billing.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        orgId,
        type: 'platform'
      }
    })
    
    return setupIntent
  } catch (error: any) {
    
    // Provide more specific error messages
    if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
      throw new Error(`Stripe connection error: ${error.message}. Please check your internet connection and Stripe service status.`)
    } else if (error.type === 'StripeAuthenticationError') {
      throw new Error('Stripe authentication failed. Please check your STRIPE_SECRET_KEY environment variable.')
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Invalid Stripe request: ${error.message}`)
    }
    
    throw new Error(`Stripe API error: ${error.message || 'Failed to create setup intent'}`)
  }
}

// Create subscription with variable pricing (quantity = student count)
export async function createPlatformSubscription(orgId: string, studentCount: number) {
  const billing = await ensurePlatformCustomer(orgId)
  
  if (!billing.stripeCustomerId) {
    throw new Error('Stripe customer not found')
  }
  
  if (!billing.defaultPaymentMethodId) {
    throw new Error('Payment method not set. Please add a card first.')
  }
  
  // Check if subscription already exists
  if (billing.stripeSubscriptionId) {
    // Update existing subscription quantity
    return updatePlatformSubscription(orgId, studentCount)
  }
  
  // Calculate trial end timestamp
  const trialEnd = billing.trialEndDate 
    ? Math.floor(billing.trialEndDate.getTime() / 1000)
    : undefined
  
  // Create subscription with variable quantity
  const subscription = await stripe.subscriptions.create({
    customer: billing.stripeCustomerId,
    items: [{
      price: process.env.STRIPE_PRICE_ID!,
      quantity: studentCount
    }],
    default_payment_method: billing.defaultPaymentMethodId,
    trial_end: trialEnd,
    billing_cycle_anchor: undefined, // Let Stripe handle billing cycle
    metadata: {
      orgId,
      type: 'platform'
    }
  })
  
  const subscriptionItem = subscription.items.data[0]
  
  // Update billing record
  await prisma.platformOrgBilling.update({
    where: { orgId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: subscriptionItem.id,
      subscriptionStatus: subscription.status,
      lastBilledStudentCount: studentCount
    }
  })
  
  return subscription
}

// Update subscription quantity based on student count
export async function updatePlatformSubscription(orgId: string, studentCount: number) {
  const billing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })
  
  if (!billing?.stripeSubscriptionId || !billing.stripeSubscriptionItemId) {
    throw new Error('Subscription not found')
  }
  
  // Update subscription item quantity
  await stripe.subscriptionItems.update(billing.stripeSubscriptionItemId, {
    quantity: studentCount
  })
  
  // Update billing record
  await prisma.platformOrgBilling.update({
    where: { orgId },
    data: {
      lastBilledStudentCount: studentCount,
      lastBilledAt: new Date()
    }
  })
}

// Check if org has payment method on file
export async function hasPlatformPaymentMethod(orgId: string): Promise<boolean> {
  const billing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })
  
  return !!billing?.defaultPaymentMethodId
}

// Parent billing - Create customer under org's Connect account
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
  
  if (!org.stripeConnectAccountId) {
    throw new Error('Organization has not connected Stripe account')
  }
  
  // Create Stripe customer under the org's Connect account
  const customer = await stripe.customers.create({
    email: parent.email,
    name: parent.name || undefined,
    metadata: {
      orgId,
      parentUserId,
      type: 'parent'
    }
  }, {
    stripeAccount: org.stripeConnectAccountId
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

// Count active students for an org
export async function cancelStripeSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not initialized')
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId)
    return true
  } catch (error: any) {
    throw new Error(`Failed to cancel subscription: ${error.message}`)
  }
}

export async function getActiveStudentCount(orgId: string): Promise<number> {
  return prisma.student.count({
    where: {
      orgId,
      isArchived: false
    }
  })
}

export async function createPaymentIntent(orgId: string, parentUserId: string, amountP: number, invoiceId: string) {
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeConnectAccountId) {
    throw new Error('Organization has not connected Stripe account')
  }
  
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
  }, {
    stripeAccount: org.stripeConnectAccountId
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
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeConnectAccountId) {
    throw new Error('Organization has not connected Stripe account')
  }
  
  const profile = await ensureParentCustomer(orgId, parentUserId)
  
  return stripe.setupIntents.create({
    customer: profile.stripeCustomerId!,
    usage: 'off_session',
    metadata: {
      orgId,
      parentUserId
    }
  }, {
    stripeAccount: org.stripeConnectAccountId
  })
}

export async function attemptOffSessionPayment(orgId: string, parentUserId: string, invoiceId: string, amountP: number) {
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeConnectAccountId) {
    return null
  }
  
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
    }, {
      stripeAccount: org.stripeConnectAccountId
    })
    
    return paymentIntent
  } catch (error) {
    return null
  }
}

// Stripe Connect onboarding
export async function createConnectAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  if (!stripe) {
    throw new Error('Stripe is not initialized')
  }
  
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  })
}

export async function createConnectAccount(orgId: string, email: string) {
  if (!stripe) {
    throw new Error('Stripe is not initialized')
  }
  
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: {
      orgId
    }
  })
  
  return account
}

// Report usage to Stripe for metered billing
export async function reportUsage(orgId: string, studentCount: number) {
  if (!stripe) {
    throw new Error('Stripe is not initialized')
  }

  const billing = await prisma.platformOrgBilling.findUnique({
    where: { orgId }
  })

  if (!billing?.stripeSubscriptionId || !billing.stripeSubscriptionItemId) {
    throw new Error('Subscription not found for organization')
  }

  // Report usage to Stripe (for metered billing)
  // This uses the subscription item's usage records
  await stripe.subscriptionItems.createUsageRecord(
    billing.stripeSubscriptionItemId,
    {
      quantity: studentCount,
      timestamp: Math.floor(Date.now() / 1000)
    }
  )

  // Update billing record
  await prisma.platformOrgBilling.update({
    where: { orgId },
    data: {
      lastBilledStudentCount: studentCount,
      lastBilledAt: new Date()
    }
  })
}
