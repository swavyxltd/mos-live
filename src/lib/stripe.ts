import Stripe from 'stripe'
import { prisma } from './prisma'
import crypto from 'crypto'

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
    throw new Error('Organisation not found')
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
      id: crypto.randomUUID(),
      orgId,
      stripeCustomerId: customer.id,
      billingAnniversaryDate,
      trialEndDate,
      subscriptionStatus: 'trialing',
      updatedAt: new Date()
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
    throw new Error('Organisation not found')
  }
  
  if (!org.stripeConnectAccountId) {
    throw new Error('Organisation has not connected Stripe account')
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
    throw new Error('Organisation has not connected Stripe account')
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
      id: crypto.randomUUID(),
      orgId,
      invoiceId,
      method: 'CARD',
      amountP,
      status: 'PENDING',
      providerId: paymentIntent.id,
      updatedAt: new Date()
    }
  })
  
  return paymentIntent
}

export async function createSetupIntent(orgId: string, parentUserId: string) {
  const org = await prisma.org.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeConnectAccountId) {
    throw new Error('Organisation has not connected Stripe account')
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
    throw new Error('Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.')
  }
  
  try {
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    })
  } catch (error: any) {
    // Provide more specific error messages
    if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
      throw new Error(`Stripe connection error: ${error.message}. Please check your internet connection and Stripe service status.`)
    } else if (error.type === 'StripeAuthenticationError') {
      throw new Error('Stripe authentication failed. Please check your STRIPE_SECRET_KEY environment variable.')
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Invalid Stripe request: ${error.message}`)
    }
    
    throw new Error(`Stripe API error: ${error.message || 'Failed to create account link'}`)
  }
}

export async function createConnectAccount(orgId: string, email: string) {
  if (!stripe) {
    throw new Error('Stripe is not initialized. Please check STRIPE_SECRET_KEY environment variable.')
  }

  // Validate API key format
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }
  
  // Check if it's a restricted key (which won't work for Connect)
  if (apiKey.startsWith('rk_live_') || apiKey.startsWith('rk_test_')) {
    throw new Error('Restricted keys (rk_live_/rk_test_) cannot create Connect accounts. Please use a secret key (sk_live_/sk_test_) instead. Get your secret key from: https://dashboard.stripe.com/apikeys')
  }
  
  if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
    throw new Error('Invalid Stripe API key format. Key must start with sk_live_ or sk_test_ (not rk_live_ or rk_test_)')
  }

  // Check if using test or live mode
  const isTestMode = apiKey.startsWith('sk_test_')
  const modeText = isTestMode ? 'Test Mode' : 'Live Mode'
  
  try {
    // First, verify the platform account can create Connect accounts
    // by checking if we can list accounts (this confirms Connect is fully enabled)
    try {
      await stripe.accounts.list({ limit: 1 })
    } catch (listError: any) {
      // If listing fails, Connect might not be fully enabled
      if (listError.code === 'account_invalid' || listError.message?.includes('Connect')) {
        const dashboardUrl = isTestMode 
          ? 'https://dashboard.stripe.com/test/settings/connect'
          : 'https://dashboard.stripe.com/settings/connect'
        throw new Error(`Stripe Connect API access is restricted. Please check:\n1. Your platform account has no restrictions\n2. API key has full permissions\n3. Contact Stripe Support: https://support.stripe.com/\n\nDashboard: ${dashboardUrl}`)
      }
    }

    // Try to create the Express account directly
    // The error message from Stripe will tell us exactly what's wrong
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
  } catch (error: any) {
    // Provide more specific error messages
    if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
      throw new Error(`Stripe connection error: ${error.message}. Please check your internet connection and Stripe service status.`)
    } else if (error.type === 'StripeAuthenticationError') {
      throw new Error('Stripe authentication failed. Please check your STRIPE_SECRET_KEY environment variable.')
    } else if (error.type === 'StripeInvalidRequestError') {
      // Check for specific Connect-related errors
      if (error.message?.includes('Connect') || error.message?.includes('connect') || error.code === 'account_invalid') {
        const dashboardUrl = isTestMode 
          ? 'https://dashboard.stripe.com/test/settings/connect'
          : 'https://dashboard.stripe.com/settings/connect'
        const helpUrl = 'https://stripe.com/docs/connect/quickstart'
        
        // Provide more detailed troubleshooting
        let troubleshooting = ''
        if (error.message?.includes("signed up for Connect")) {
          troubleshooting = '\n\nTroubleshooting:\n1. Go to Settings → Connect in your Stripe Dashboard\n2. Look for "Get started" or "Complete setup" button\n3. Accept Connect terms of service\n4. Complete any required business verification\n5. Ensure you\'re using the correct API key (Live vs Test mode must match)\n6. Contact Stripe Support if the issue persists: https://support.stripe.com/'
        }
        
        throw new Error(`Stripe Connect is not enabled for your account in ${modeText}. ${error.message}${troubleshooting}\n\nDashboard: ${dashboardUrl}\nDocumentation: ${helpUrl}`)
      }
      throw new Error(`Invalid Stripe request: ${error.message}`)
    }
    
    throw new Error(`Stripe API error: ${error.message || 'Failed to create Connect account'}`)
  }
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
    throw new Error('Subscription not found for organisation')
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
