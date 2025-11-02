// Quick script to create owner account
require('dotenv').config({ path: '.env' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testing database connection...')
    
    // Try to query if User table exists
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database connected')
    
    // Check if User table exists by trying to count
    try {
      const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`
      console.log('✅ User table exists')
    } catch (e) {
      console.log('❌ User table does not exist. Creating tables first...')
      console.log('Run: npx prisma db push')
      process.exit(1)
    }
    
    // Create owner account
    const ownerEmail = 'swavyxltd@gmail.com'
    console.log(`\n🔧 Creating owner account: ${ownerEmail}`)
    
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

    console.log('\n✅ Owner account created/updated:')
    console.log('   - Email:', owner.email)
    console.log('   - Name:', owner.name)
    console.log('   - Super Admin:', owner.isSuperAdmin)
    console.log('   - ID:', owner.id)
    console.log('\n📝 Login Instructions:')
    console.log('   Email:', ownerEmail)
    console.log('   Password: demo123')
    console.log('\n✅ Setup complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 'P2021') {
      console.log('\n📝 Tables need to be created first.')
      console.log('Run: npx prisma db push')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

