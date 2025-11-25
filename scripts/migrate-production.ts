#!/usr/bin/env tsx
/**
 * Production Migration Helper
 * Helps safely run migrations on production database
 * 
 * Usage: npm run migrate:prod
 */

import { execSync } from 'child_process'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function migrateProduction() {
  console.log('🗄️  Production Migration Helper\n')
  console.log('='.repeat(50))
  console.log()

  // Check if we're in production
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv !== 'production') {
    console.log('⚠️  Warning: NODE_ENV is not set to "production"')
    const proceed = await question('Continue anyway? (yes/no): ')
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  // Check database URL
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
  if (!dbUrl) {
    console.error('❌ DATABASE_URL or POSTGRES_PRISMA_URL not set')
    process.exit(1)
  }

  // Check if it's a production database
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.log('⚠️  Warning: Database URL appears to be local')
    const proceed = await question('Is this correct? (yes/no): ')
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  // Check SSL
  if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('?ssl=true')) {
    console.log('⚠️  Warning: SSL mode not explicitly required')
    console.log('   Production databases should use SSL')
    const proceed = await question('Continue anyway? (yes/no): ')
    if (proceed.toLowerCase() !== 'yes') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  console.log()
  console.log('📋 Pre-Migration Checklist:')
  console.log('   [ ] Database backup created')
  console.log('   [ ] Tested migrations on staging')
  console.log('   [ ] Reviewed migration files')
  console.log('   [ ] Team notified of maintenance window')
  console.log()
  
  const checklist = await question('Have you completed the checklist? (yes/no): ')
  if (checklist.toLowerCase() !== 'yes') {
    console.log('Please complete the checklist before proceeding.')
    process.exit(0)
  }

  console.log()
  console.log('🔍 Checking migration status...')
  try {
    const status = execSync('npx prisma migrate status', { 
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    console.log(status)
  } catch (error: any) {
    console.log('Migration status check output:')
    console.log(error.stdout || error.message)
  }

  console.log()
  const confirm = await question('Ready to deploy migrations? (yes/no): ')
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }

  console.log()
  console.log('🚀 Deploying migrations...')
  console.log()

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
    })
    console.log()
    console.log('✅ Migrations deployed successfully!')
    console.log()
    console.log('Next steps:')
    console.log('1. Verify application is working')
    console.log('2. Check error logs')
    console.log('3. Monitor for issues')
  } catch (error: any) {
    console.error()
    console.error('❌ Migration failed!')
    console.error('Review the error above and:')
    console.error('1. Check database connectivity')
    console.error('2. Verify migration files are correct')
    console.error('3. Check for conflicting migrations')
    console.error('4. Restore from backup if needed')
    process.exit(1)
  } finally {
    rl.close()
  }
}

migrateProduction().catch((error) => {
  console.error('Unexpected error:', error)
  rl.close()
  process.exit(1)
})

