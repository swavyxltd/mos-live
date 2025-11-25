#!/usr/bin/env tsx
/**
 * Stripe Configuration Test Script
 * Tests Stripe API connectivity and configuration
 */

import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePriceId = process.env.STRIPE_PRICE_ID
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

async function testStripeConfig() {
  console.log('💳 Testing Stripe Configuration...\n')

  let hasErrors = false
  let hasWarnings = false

  // Check environment variables
  console.log('1. Checking Environment Variables:')
  
  if (!stripeSecretKey) {
    console.log('   ❌ STRIPE_SECRET_KEY is not set')
    hasErrors = true
  } else {
    if (stripeSecretKey.startsWith('sk_live_')) {
      console.log('   ✅ STRIPE_SECRET_KEY is set (LIVE mode)')
    } else if (stripeSecretKey.startsWith('sk_test_')) {
      console.log('   ⚠️  STRIPE_SECRET_KEY is set (TEST mode)')
      hasWarnings = true
    } else {
      console.log('   ❌ STRIPE_SECRET_KEY format is invalid')
      hasErrors = true
    }
  }

  if (!stripePublishableKey) {
    console.log('   ❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    hasErrors = true
  } else {
    if (stripePublishableKey.startsWith('pk_live_')) {
      console.log('   ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set (LIVE mode)')
    } else if (stripePublishableKey.startsWith('pk_test_')) {
      console.log('   ⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set (TEST mode)')
      hasWarnings = true
    } else {
      console.log('   ❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format is invalid')
      hasErrors = true
    }
  }

  if (!stripePriceId) {
    console.log('   ❌ STRIPE_PRICE_ID is not set')
    hasErrors = true
  } else {
    console.log(`   ✅ STRIPE_PRICE_ID is set: ${stripePriceId}`)
  }

  if (!stripeWebhookSecret) {
    console.log('   ⚠️  STRIPE_WEBHOOK_SECRET is not set (webhooks may not work)')
    hasWarnings = true
  } else {
    if (stripeWebhookSecret.startsWith('whsec_')) {
      console.log('   ✅ STRIPE_WEBHOOK_SECRET is set')
    } else {
      console.log('   ⚠️  STRIPE_WEBHOOK_SECRET format may be invalid')
      hasWarnings = true
    }
  }

  console.log()

  // Test API connection
  if (stripeSecretKey) {
    console.log('2. Testing Stripe API Connection:')
    try {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
      })

      // Test 1: Get account info
      try {
        const account = await stripe.accounts.retrieve()
        console.log(`   ✅ Connected to Stripe account: ${account.id}`)
        console.log(`   ✅ Account type: ${account.type}`)
        if (account.country) {
          console.log(`   ✅ Country: ${account.country}`)
        }
      } catch (error: any) {
        console.log(`   ❌ Failed to retrieve account: ${error.message}`)
        hasErrors = true
      }

      // Test 2: Verify price exists
      if (stripePriceId) {
        try {
          const price = await stripe.prices.retrieve(stripePriceId)
          console.log(`   ✅ Price exists: ${price.id}`)
          console.log(`   ✅ Price amount: ${price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A'} ${price.currency?.toUpperCase()}`)
          console.log(`   ✅ Price type: ${price.type}`)
          if (price.type === 'recurring') {
            console.log(`   ✅ Billing interval: ${price.recurring?.interval}`)
          }
        } catch (error: any) {
          console.log(`   ❌ Price not found: ${error.message}`)
          hasErrors = true
        }
      }

      // Test 3: List webhooks (if possible)
      try {
        const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
        console.log(`   ✅ Found ${webhooks.data.length} webhook endpoint(s)`)
        if (webhooks.data.length > 0) {
          webhooks.data.forEach((webhook, index) => {
            console.log(`      ${index + 1}. ${webhook.url} (${webhook.status})`)
          })
        } else {
          console.log('   ⚠️  No webhook endpoints configured')
          hasWarnings = true
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not list webhooks: ${error.message}`)
        hasWarnings = true
      }

    } catch (error: any) {
      console.log(`   ❌ Stripe API connection failed: ${error.message}`)
      hasErrors = true
    }
  } else {
    console.log('2. Skipping API tests (STRIPE_SECRET_KEY not set)')
  }

  console.log()

  // Summary
  console.log('='.repeat(50))
  if (hasErrors) {
    console.log('❌ Stripe configuration has errors - fix before deploying!')
    console.log('\nNext steps:')
    console.log('1. Set all required environment variables')
    console.log('2. Verify Stripe keys are production keys (not test)')
    console.log('3. Configure webhook endpoint in Stripe Dashboard')
    console.log('4. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Stripe configuration has warnings')
    console.log('   Review warnings above and fix if needed')
    process.exit(0)
  } else {
    console.log('✅ Stripe configuration is valid!')
    process.exit(0)
  }
}

testStripeConfig().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

