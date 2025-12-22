/**
 * Test script to verify billing day functionality
 * 
 * Usage:
 *   npm run ts-node scripts/test-billing-day.ts [orgSlug] [billingDay]
 * 
 * Example:
 *   npm run ts-node scripts/test-billing-day.ts "test-islamic-school" 15
 */

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const orgSlug = process.argv[2]
  const billingDay = process.argv[3] ? parseInt(process.argv[3]) : null

  if (!orgSlug) {
    console.error('❌ Please provide an organisation slug')
    console.log('\nUsage: npm run ts-node scripts/test-billing-day.ts [orgSlug] [billingDay]')
    process.exit(1)
  }

  try {
    console.log(`🔍 Testing billing day for organisation: "${orgSlug}"\n`)

    // Find the org
    const org = await prisma.org.findUnique({
      where: { slug: orgSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        billingDay: true,
        feeDueDay: true
      }
    })

    if (!org) {
      console.error(`❌ Organisation with slug "${orgSlug}" not found`)
      process.exit(1)
    }

    console.log(`📊 Current Organisation Details:`)
    console.log(`   Name: ${org.name}`)
    console.log(`   Slug: ${org.slug}`)
    console.log(`   ID: ${org.id}`)
    console.log(`   Current billingDay: ${org.billingDay ?? 'null'}`)
    console.log(`   Current feeDueDay: ${org.feeDueDay ?? 'null'}\n`)

    // Test the getBillingDay function
    const { getBillingDay } = await import('../src/lib/billing-day')
    const currentBillingDay = getBillingDay(org)
    console.log(`✅ Calculated billing day: ${currentBillingDay}\n`)

    // If billing day is provided, test updating it
    if (billingDay !== null) {
      if (billingDay < 1 || billingDay > 28) {
        console.error('❌ Billing day must be between 1 and 28')
        process.exit(1)
      }

      console.log(`🔄 Testing update to billing day ${billingDay}...\n`)

      const { prepareBillingDayUpdate } = await import('../src/lib/billing-day')
      const updateData = prepareBillingDayUpdate(billingDay)

      if (!updateData) {
        console.error('❌ Invalid billing day value')
        process.exit(1)
      }

      const updatedOrg = await prisma.org.update({
        where: { id: org.id },
        data: {
          billingDay: updateData.billingDay,
          feeDueDay: updateData.feeDueDay,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          billingDay: true,
          feeDueDay: true
        }
      })

      console.log('✅ Billing day updated successfully!')
      console.log(`   billingDay: ${updatedOrg.billingDay}`)
      console.log(`   feeDueDay: ${updatedOrg.feeDueDay}\n`)

      // Verify the update
      const verifiedBillingDay = getBillingDay(updatedOrg)
      if (verifiedBillingDay === billingDay) {
        console.log(`✅ Verification passed: billing day is correctly set to ${verifiedBillingDay}`)
      } else {
        console.error(`❌ Verification failed: expected ${billingDay}, got ${verifiedBillingDay}`)
        process.exit(1)
      }
    } else {
      console.log('ℹ️  No billing day provided. Use [billingDay] parameter to test updating.')
      console.log('   Example: npm run ts-node scripts/test-billing-day.ts "test-islamic-school" 15\n')
    }

    // Test validation
    console.log('\n🧪 Testing validation:')
    const { validateBillingDay } = await import('../src/lib/billing-day')
    
    const testCases = [
      { value: 1, expected: 1 },
      { value: 15, expected: 15 },
      { value: 28, expected: 28 },
      { value: 0, expected: null },
      { value: 29, expected: null },
      { value: null, expected: null },
      { value: undefined, expected: null },
      { value: '15', expected: 15 },
      { value: 'invalid', expected: null }
    ]

    let passed = 0
    let failed = 0

    for (const testCase of testCases) {
      const result = validateBillingDay(testCase.value)
      if (result === testCase.expected) {
        console.log(`   ✅ ${JSON.stringify(testCase.value)} → ${result}`)
        passed++
      } else {
        console.log(`   ❌ ${JSON.stringify(testCase.value)} → ${result} (expected ${testCase.expected})`)
        failed++
      }
    }

    console.log(`\n📊 Validation tests: ${passed} passed, ${failed} failed`)

    if (failed > 0) {
      process.exit(1)
    }

    console.log('\n✅ All tests passed!')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

