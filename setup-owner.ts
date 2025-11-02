import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local if it exists
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Setting up owner account...')
  
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
    console.log('   DATABASE_URL="your-url" npm run setup:owner\n')
    process.exit(1)
  }
  
  console.log('✅ DATABASE_URL found\n')

  const ownerEmail = 'swavyxltd@gmail.com'

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

  console.log('✅ Owner account created/updated:', owner.email)
  console.log('   - Super Admin:', owner.isSuperAdmin)
  console.log('   - ID:', owner.id)

  // Note: Passwords are not stored in User table currently
  // You can sign in via Google OAuth or the demo password 'demo123' if configured
  console.log('\n📝 Login options:')
  console.log('   1. Google OAuth (recommended): Use "Continue with Google" button')
  console.log('   2. Email/Password: Use email and password "demo123"')
  console.log('\n✅ Setup complete! You can now sign in.')
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

