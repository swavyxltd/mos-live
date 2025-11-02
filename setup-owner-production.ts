import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local if it exists
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Setting up owner account for production...')
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ Error: DATABASE_URL environment variable is not set!')
    console.log('\n📝 To fix this:')
    console.log('   1. Create a .env.local file in the project root')
    console.log('   2. Add your DATABASE_URL:')
    console.log('      DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"')
    console.log('\n   OR get it from Vercel:')
    console.log('   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
    console.log('   2. Copy the DATABASE_URL value')
    console.log('   3. Add it to .env.local file')
    console.log('\n   OR set it inline:')
    console.log('   DATABASE_URL="your-url" npm run setup:owner:prod\n')
    process.exit(1)
  }
  
  console.log('✅ DATABASE_URL found')
  console.log('📧 Using DATABASE_URL from environment variables\n')

  const ownerEmail = process.env.OWNER_EMAIL || 'swavyxltd@gmail.com'

  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection successful\n')

    // Create or update owner user
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {
        isSuperAdmin: true,
        name: ownerEmail.split('@')[0] || 'Owner',
      },
      create: {
        email: ownerEmail,
        name: ownerEmail.split('@')[0] || 'Owner',
        isSuperAdmin: true,
      },
    })

    console.log('✅ Owner account created/updated:')
    console.log('   - Email:', owner.email)
    console.log('   - Name:', owner.name)
    console.log('   - Super Admin:', owner.isSuperAdmin)
    console.log('   - ID:', owner.id)
    console.log('\n📝 Login Instructions:')
    console.log('   1. Go to: /auth/signin')
    console.log(`   2. Email: ${ownerEmail}`)
    console.log('   3. Password: demo123')
    console.log('\n✅ Setup complete! You can now sign in.')
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message)
    if (error.code === 'P2002') {
      console.error('   User already exists, attempting to update...')
      try {
        const owner = await prisma.user.update({
          where: { email: ownerEmail },
          data: { isSuperAdmin: true },
        })
        console.log('✅ Owner account updated:', owner.email)
      } catch (updateError) {
        console.error('❌ Update also failed:', updateError)
      }
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

