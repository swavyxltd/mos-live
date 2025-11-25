#!/usr/bin/env tsx
/**
 * Billing System Verification Script
 * Verifies that the automatic billing system is properly configured
 */

import { prisma } from '../src/lib/prisma'

async function verifyBillingSetup() {
  console.log('💳 Verifying Billing System Setup...\n')
  console.log('='.repeat(50))
  console.log()

  let hasErrors = false
  let hasWarnings = false

  // Check 1: Environment Variables
  console.log('1. Checking Environment Variables:')
  const requiredEnvVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`)
    } else {
      console.log(`   ❌ ${envVar} is missing`)
      hasErrors = true
    }
  }
  console.log()

  // Check 2: Cron Jobs Configuration
  console.log('2. Checking Cron Jobs Configuration:')
  try {
    const vercelJson = await import('../vercel.json')
    const crons = vercelJson.default?.crons || []
    
    const billingCron = crons.find((c: any) => c.path === '/api/cron/billing')
    const overdueCron = crons.find((c: any) => c.path === '/api/cron/check-overdue')
    
    if (billingCron) {
      console.log(`   ✅ Billing cron configured: ${billingCron.path} (${billingCron.schedule})`)
    } else {
      console.log('   ❌ Billing cron not found in vercel.json')
      hasErrors = true
    }
    
    if (overdueCron) {
      console.log(`   ✅ Overdue check cron configured: ${overdueCron.path} (${overdueCron.schedule})`)
    } else {
      console.log('   ⚠️  Overdue check cron not found in vercel.json')
      hasWarnings = true
    }
  } catch (error) {
    console.log('   ⚠️  Could not read vercel.json')
    hasWarnings = true
  }
  console.log()

  // Check 3: Database Schema
  console.log('3. Checking Database Schema:')
  try {
    // Check if PlatformOrgBilling table exists and has required fields
    const sampleBilling = await prisma.platformOrgBilling.findFirst({
      select: {
        id: true,
        orgId: true,
        billingAnniversaryDate: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeSubscriptionItemId: true,
        subscriptionStatus: true,
        defaultPaymentMethodId: true,
        lastBilledStudentCount: true,
        lastBilledAt: true,
      },
    })

    if (sampleBilling !== null) {
      console.log('   ✅ PlatformOrgBilling table exists with required fields')
      
      // Check if billing records have anniversary dates
      const orgsWithoutAnniversary = await prisma.platformOrgBilling.count({
        where: {
          billingAnniversaryDate: null,
        },
      })
      
      if (orgsWithoutAnniversary > 0) {
        console.log(`   ⚠️  ${orgsWithoutAnniversary} org(s) without billing anniversary date`)
        hasWarnings = true
      } else {
        console.log('   ✅ All orgs have billing anniversary dates')
      }
    } else {
      // Table exists but no records (this is OK)
      console.log('   ✅ PlatformOrgBilling table exists')
    }
  } catch (error: any) {
    console.log(`   ❌ Database check failed: ${error.message}`)
    hasErrors = true
  }
  console.log()

  // Check 4: Organizations with Billing
  console.log('4. Checking Organizations:')
  try {
    const totalOrgs = await prisma.org.count()
    const orgsWithBilling = await prisma.platformOrgBilling.count()
    
    const orgsWithSubscription = await prisma.platformOrgBilling.count({
      where: {
        stripeSubscriptionId: {
          not: null,
        },
      },
    })
    
    const orgsWithPaymentMethod = await prisma.platformOrgBilling.count({
      where: {
        defaultPaymentMethodId: {
          not: null,
        },
      },
    })

    console.log(`   Total organizations: ${totalOrgs}`)
    console.log(`   Organizations with billing record: ${orgsWithBilling}`)
    console.log(`   Organizations with subscription: ${orgsWithSubscription}`)
    console.log(`   Organizations with payment method: ${orgsWithPaymentMethod}`)
    
    if (orgsWithBilling < totalOrgs) {
      console.log(`   ⚠️  ${totalOrgs - orgsWithBilling} org(s) without billing records`)
      hasWarnings = true
    }
  } catch (error: any) {
    console.log(`   ❌ Failed to check organizations: ${error.message}`)
    hasErrors = true
  }
  console.log()

  // Check 5: Upcoming Billing
  console.log('5. Checking Upcoming Billing:')
  try {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDay = tomorrow.getDate()

    const orgsToBillTomorrow = await prisma.platformOrgBilling.count({
      where: {
        billingAnniversaryDate: tomorrowDay,
        subscriptionStatus: {
          in: ['active', 'trialing'],
        },
        defaultPaymentMethodId: {
          not: null,
        },
          Org: {
            status: 'ACTIVE',
          },
      },
    })

    console.log(`   Organizations to be billed tomorrow (day ${tomorrowDay}): ${orgsToBillTomorrow}`)
    
    if (orgsToBillTomorrow > 0) {
      console.log('   ✅ Billing cron will process orgs tomorrow')
    } else {
      console.log('   ℹ️  No orgs scheduled for billing tomorrow')
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not check upcoming billing: ${error.message}`)
    hasWarnings = true
  }
  console.log()

  // Summary
  console.log('='.repeat(50))
  if (hasErrors) {
    console.log('❌ Billing system has errors - fix before going live!')
    console.log('\nNext steps:')
    console.log('1. Set all required environment variables')
    console.log('2. Verify cron jobs are configured in vercel.json')
    console.log('3. Check database schema is correct')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Billing system has warnings')
    console.log('   Review warnings above and fix if needed')
    process.exit(0)
  } else {
    console.log('✅ Billing system is properly configured!')
    console.log('\nThe system will automatically:')
    console.log('1. Update subscription quantities daily (day before anniversary)')
    console.log('2. Stripe will charge orgs on their anniversary date')
    console.log('3. Webhooks will update subscription status')
    console.log('4. Failed payments will be handled by overdue cron')
    process.exit(0)
  }
}

verifyBillingSetup()
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })

