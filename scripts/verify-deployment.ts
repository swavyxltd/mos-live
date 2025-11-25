#!/usr/bin/env tsx
/**
 * Deployment Verification Script
 * Verifies that deployment is successful and all services are working
 */

const productionUrl = process.env.PRODUCTION_URL || process.env.NEXTAUTH_URL || 'https://your-app.vercel.app'

async function verifyDeployment() {
  console.log('🔍 Verifying Deployment...\n')
  console.log(`Target: ${productionUrl}\n`)

  let hasErrors = false
  let hasWarnings = false

  // Test 1: Health Check
  console.log('1. Testing Health Check Endpoint:')
  try {
    const healthResponse = await fetch(`${productionUrl}/api/health`)
    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log(`   ✅ Health check passed`)
      console.log(`   Status: ${health.status}`)
      console.log(`   Database: ${health.checks.database}`)
      console.log(`   Stripe: ${health.checks.stripe}`)
      console.log(`   Resend: ${health.checks.resend}`)
      
      if (health.status !== 'healthy') {
        hasWarnings = true
      }
    } else {
      console.log(`   ❌ Health check failed: ${healthResponse.status}`)
      hasErrors = true
    }
  } catch (error: any) {
    console.log(`   ❌ Health check error: ${error.message}`)
    hasErrors = true
  }
  console.log()

  // Test 2: Homepage
  console.log('2. Testing Homepage:')
  try {
    const homeResponse = await fetch(productionUrl)
    if (homeResponse.ok) {
      console.log(`   ✅ Homepage loads (${homeResponse.status})`)
    } else {
      console.log(`   ⚠️  Homepage returned ${homeResponse.status}`)
      hasWarnings = true
    }
  } catch (error: any) {
    console.log(`   ❌ Homepage error: ${error.message}`)
    hasErrors = true
  }
  console.log()

  // Test 3: SSL/HTTPS
  console.log('3. Testing SSL/HTTPS:')
  if (productionUrl.startsWith('https://')) {
    console.log('   ✅ Using HTTPS')
  } else {
    console.log('   ⚠️  Not using HTTPS (recommended for production)')
    hasWarnings = true
  }
  console.log()

  // Test 4: API Routes (public endpoints)
  console.log('4. Testing API Routes:')
  const apiEndpoints = [
    '/api/health',
  ]

  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(`${productionUrl}${endpoint}`)
      if (response.ok) {
        console.log(`   ✅ ${endpoint} works`)
      } else {
        console.log(`   ⚠️  ${endpoint} returned ${response.status}`)
        hasWarnings = true
      }
    } catch (error: any) {
      console.log(`   ❌ ${endpoint} error: ${error.message}`)
      hasErrors = true
    }
  }
  console.log()

  // Test 5: Check response times
  console.log('5. Testing Response Times:')
  const startTime = Date.now()
  try {
    await fetch(`${productionUrl}/api/health`)
    const responseTime = Date.now() - startTime
    console.log(`   ✅ Response time: ${responseTime}ms`)
    if (responseTime > 2000) {
      console.log('   ⚠️  Response time is slow (>2s)')
      hasWarnings = true
    }
  } catch (error: any) {
    console.log(`   ❌ Response time test failed: ${error.message}`)
    hasErrors = true
  }
  console.log()

  // Summary
  console.log('='.repeat(50))
  if (hasErrors) {
    console.log('❌ Deployment verification FAILED')
    console.log('\nNext steps:')
    console.log('1. Check Vercel deployment logs')
    console.log('2. Verify environment variables are set')
    console.log('3. Check database connectivity')
    console.log('4. Review error logs')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Deployment verification passed with warnings')
    console.log('   Review warnings above')
    process.exit(0)
  } else {
    console.log('✅ Deployment verification PASSED!')
    console.log('\nYour application is ready! 🎉')
    process.exit(0)
  }
}

verifyDeployment().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

