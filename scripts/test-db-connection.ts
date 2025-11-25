#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 * Tests database connectivity and basic queries
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testing database connection...\n')

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    await prisma.$connect()
    console.log('   ✅ Database connection successful\n')

    // Test 2: Simple query
    console.log('2. Testing simple query...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('   ✅ Query executed successfully:', result, '\n')

    // Test 3: Check if tables exist
    console.log('3. Checking database schema...')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    console.log(`   ✅ Found ${tables.length} tables:`)
    tables.forEach(table => {
      console.log(`      - ${table.tablename}`)
    })
    console.log()

    // Test 4: Check critical tables
    console.log('4. Verifying critical tables exist...')
    const criticalTables = ['User', 'Org', 'Student', 'Class', 'Invoice']
    const existingTables = tables.map(t => t.tablename)
    
    let allTablesExist = true
    criticalTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✅ Table "${table}" exists`)
      } else {
        console.log(`   ❌ Table "${table}" is missing`)
        allTablesExist = false
      }
    })
    console.log()

    // Test 5: Test organization query (multi-tenancy check)
    console.log('5. Testing multi-tenant query...')
    const orgCount = await prisma.org.count()
    console.log(`   ✅ Found ${orgCount} organization(s)`)
    console.log()

    // Test 6: Check SSL connection
    console.log('6. Checking connection details...')
    const connectionInfo = await prisma.$queryRaw<Array<{ ssl: boolean }>>`
      SELECT ssl_is_used() as ssl
    `.catch(() => {
      // Some databases don't support this query
      return [{ ssl: null }]
    })
    
    if (connectionInfo[0]?.ssl !== null) {
      console.log(`   ${connectionInfo[0]?.ssl ? '✅' : '⚠️ '} SSL: ${connectionInfo[0]?.ssl ? 'Enabled' : 'Disabled'}`)
      if (!connectionInfo[0]?.ssl) {
        console.log('   ⚠️  Warning: SSL is recommended for production')
      }
    } else {
      console.log('   ℹ️  SSL status: Unable to determine')
    }
    console.log()

    console.log('='.repeat(50))
    if (allTablesExist) {
      console.log('✅ All database tests passed!')
      process.exit(0)
    } else {
      console.log('⚠️  Some critical tables are missing. Run migrations:')
      console.log('   npx prisma migrate deploy')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Database connection test failed:')
    console.error(error)
    console.log('\nTroubleshooting:')
    console.log('1. Check DATABASE_URL or POSTGRES_PRISMA_URL environment variable')
    console.log('2. Verify database is running and accessible')
    console.log('3. Check network connectivity and firewall rules')
    console.log('4. Verify SSL mode if required: ?sslmode=require')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

