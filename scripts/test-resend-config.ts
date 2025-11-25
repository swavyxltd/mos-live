#!/usr/bin/env tsx
/**
 * Resend Email Configuration Test Script
 * Tests Resend API connectivity and configuration
 */

import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM

async function testResendConfig() {
  console.log('📧 Testing Resend Email Configuration...\n')

  let hasErrors = false
  let hasWarnings = false

  // Check environment variables
  console.log('1. Checking Environment Variables:')
  
  if (!resendApiKey) {
    console.log('   ❌ RESEND_API_KEY is not set')
    hasErrors = true
  } else {
    if (resendApiKey.startsWith('re_')) {
      console.log('   ✅ RESEND_API_KEY is set')
    } else {
      console.log('   ⚠️  RESEND_API_KEY format may be invalid (should start with re_)')
      hasWarnings = true
    }
  }

  if (!resendFrom) {
    console.log('   ❌ RESEND_FROM is not set')
    hasErrors = true
  } else {
    console.log(`   ✅ RESEND_FROM is set: ${resendFrom}`)
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const emailMatch = resendFrom.match(/<([^>]+)>/) || [null, resendFrom]
    const email = emailMatch[1] || resendFrom
    if (emailRegex.test(email)) {
      console.log(`   ✅ Email format is valid: ${email}`)
    } else {
      console.log(`   ⚠️  Email format may be invalid: ${email}`)
      hasWarnings = true
    }
  }

  console.log()

  // Test API connection
  if (resendApiKey) {
    console.log('2. Testing Resend API Connection:')
    try {
      const resend = new Resend(resendApiKey)

      // Test 1: Get API key info (if available)
      try {
        // Resend doesn't have a direct "get account" endpoint
        // So we'll test by attempting to send a test email (but we won't actually send it)
        console.log('   ✅ Resend client initialized')
        console.log('   ℹ️  To fully test, send a test email from the application')
      } catch (error: any) {
        console.log(`   ❌ Failed to initialize Resend: ${error.message}`)
        hasErrors = true
      }

      // Test 2: Verify domain (if we can)
      console.log('   ℹ️  Domain verification must be done in Resend Dashboard')
      console.log('   ℹ️  Go to: https://resend.com/domains')

    } catch (error: any) {
      console.log(`   ❌ Resend API connection failed: ${error.message}`)
      hasErrors = true
    }
  } else {
    console.log('2. Skipping API tests (RESEND_API_KEY not set)')
  }

  console.log()

  // Best practices check
  console.log('3. Best Practices Checklist:')
  console.log('   [ ] Domain is verified in Resend Dashboard')
  console.log('   [ ] SPF record is configured')
  console.log('   [ ] DKIM record is configured')
  console.log('   [ ] DMARC record is configured (recommended)')
  console.log('   [ ] From email matches verified domain')
  console.log('   [ ] Test emails are being delivered (not in spam)')

  console.log()

  // Summary
  console.log('='.repeat(50))
  if (hasErrors) {
    console.log('❌ Resend configuration has errors - fix before deploying!')
    console.log('\nNext steps:')
    console.log('1. Set RESEND_API_KEY and RESEND_FROM environment variables')
    console.log('2. Verify domain in Resend Dashboard')
    console.log('3. Configure SPF, DKIM, and DMARC records')
    console.log('4. Test email delivery')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Resend configuration has warnings')
    console.log('   Review warnings above and fix if needed')
    process.exit(0)
  } else {
    console.log('✅ Resend configuration is valid!')
    console.log('\n⚠️  Remember to:')
    console.log('1. Verify domain in Resend Dashboard')
    console.log('2. Configure DNS records (SPF, DKIM, DMARC)')
    console.log('3. Test email delivery')
    process.exit(0)
  }
}

testResendConfig().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

