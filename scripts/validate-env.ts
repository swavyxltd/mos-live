#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 * Run this before deploying to production to ensure all required variables are set
 */

const requiredEnvVars = {
  core: [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'APP_BASE_URL',
  ],
  database: [
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL', // Either DATABASE_URL or POSTGRES_PRISMA_URL
  ],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
  blob: [
    'BLOB_READ_WRITE_TOKEN',
  ],
  email: [
    'RESEND_API_KEY',
    'RESEND_FROM',
  ],
  optional: [
    'META_APP_ID',
    'META_APP_SECRET',
    'WHATSAPP_VERIFY_TOKEN',
    'CRON_SECRET',
  ],
}

function validateEnvVar(name: string, required: boolean = true): { valid: boolean; message: string } {
  const value = process.env[name]
  
  if (!value) {
    return { valid: !required, message: required ? `❌ Missing required: ${name}` : `⚠️  Missing optional: ${name}` }
  }

  // Specific validations
  if (name === 'NEXTAUTH_SECRET' && value.length < 32) {
    return { valid: false, message: `❌ ${name} is too short (minimum 32 characters)` }
  }

  if (name === 'STRIPE_SECRET_KEY' && !value.startsWith('sk_live_') && !value.startsWith('sk_test_')) {
    return { valid: false, message: `⚠️  ${name} should start with sk_live_ or sk_test_` }
  }

  if (name === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' && !value.startsWith('pk_live_') && !value.startsWith('pk_test_')) {
    return { valid: false, message: `⚠️  ${name} should start with pk_live_ or pk_test_` }
  }

  if (name === 'STRIPE_WEBHOOK_SECRET' && !value.startsWith('whsec_')) {
    return { valid: false, message: `⚠️  ${name} should start with whsec_` }
  }

  if (name === 'DATABASE_URL' || name === 'POSTGRES_PRISMA_URL') {
    if (!value.includes('sslmode=require') && !value.includes('?ssl=true')) {
      return { valid: false, message: `⚠️  ${name} should include SSL mode (sslmode=require or ?ssl=true)` }
    }
  }

  return { valid: true, message: `✅ ${name} is set` }
}

function main() {
  console.log('🔍 Validating Environment Variables...\n')
  
  let hasErrors = false
  let hasWarnings = false

  // Check core variables
  console.log('📋 Core Variables:')
  requiredEnvVars.core.forEach(name => {
    const result = validateEnvVar(name, true)
    console.log(`  ${result.message}`)
    if (!result.valid) hasErrors = true
  })

  // Check database (at least one required)
  console.log('\n🗄️  Database Variables:')
  const dbUrl = process.env.DATABASE_URL
  const postgresUrl = process.env.POSTGRES_PRISMA_URL
  if (!dbUrl && !postgresUrl) {
    console.log('  ❌ Missing required: DATABASE_URL or POSTGRES_PRISMA_URL (at least one required)')
    hasErrors = true
  } else {
    if (dbUrl) {
      const result = validateEnvVar('DATABASE_URL', true)
      console.log(`  ${result.message}`)
      if (!result.valid) hasErrors = true
    }
    if (postgresUrl) {
      const result = validateEnvVar('POSTGRES_PRISMA_URL', true)
      console.log(`  ${result.message}`)
      if (!result.valid) hasErrors = true
    }
  }

  // Check Stripe
  console.log('\n💳 Stripe Variables:')
  requiredEnvVars.stripe.forEach(name => {
    const result = validateEnvVar(name, true)
    console.log(`  ${result.message}`)
    if (!result.valid) hasErrors = true
  })

  // Check Blob Storage
  console.log('\n📦 Blob Storage:')
  requiredEnvVars.blob.forEach(name => {
    const result = validateEnvVar(name, true)
    console.log(`  ${result.message}`)
    if (!result.valid) hasErrors = true
  })

  // Check Email
  console.log('\n📧 Email (Resend):')
  requiredEnvVars.email.forEach(name => {
    const result = validateEnvVar(name, true)
    console.log(`  ${result.message}`)
    if (!result.valid) hasErrors = true
  })

  // Check Optional
  console.log('\n🔧 Optional Variables:')
  requiredEnvVars.optional.forEach(name => {
    const result = validateEnvVar(name, false)
    console.log(`  ${result.message}`)
    if (result.message.includes('⚠️')) hasWarnings = true
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  if (hasErrors) {
    console.log('❌ Validation FAILED - Fix errors before deploying!')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Validation passed with warnings')
    console.log('   Review warnings above and fix if needed')
    process.exit(0)
  } else {
    console.log('✅ All environment variables are valid!')
    process.exit(0)
  }
}

main()

