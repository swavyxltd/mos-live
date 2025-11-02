import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

// Use POSTGRES_PRISMA_URL if available, otherwise DATABASE_URL
const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL

if (!dbUrl) {
  console.error('❌ No database URL found. Set POSTGRES_PRISMA_URL or DATABASE_URL')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
})

async function importData() {
  try {
    console.log('📥 Importing data to Vercel Postgres...\n')
    
    const sqlFile = 'database-export.sql'
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ Export file not found: ${sqlFile}`)
      console.error('   Run: export script first')
      process.exit(1)
    }
    
    await prisma.$connect()
    console.log('✅ Connected to Vercel Postgres\n')
    
    const sql = fs.readFileSync(sqlFile, 'utf-8')
    
    // Execute the SQL
    console.log('📝 Executing SQL migration...\n')
    await prisma.$executeRawUnsafe(sql)
    
    console.log('\n✅ Import complete!')
    console.log('   All data has been migrated to Vercel Postgres\n')
    
  } catch (error: any) {
    console.error('❌ Import failed:', error.message)
    console.error('\n   Make sure:')
    console.error('   1. Vercel Postgres database is created')
    console.error('   2. POSTGRES_PRISMA_URL is set in your environment')
    console.error('   3. Tables are created (run: npx prisma db push)')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

importData()

