import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const email = 'boycotterapp@gmail.com'
  
  console.log(`\n🔧 Disabling 2FA for: ${email}\n`)
  
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { 
        twoFactorEnabled: false,
        twoFactorCode: null,
        twoFactorCodeExpiry: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        twoFactorEnabled: true
      }
    })
    
    console.log('✅ 2FA disabled successfully!')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   2FA Enabled: ${user.twoFactorEnabled}`)
    console.log(`\n📝 Two-factor authentication has been turned off for this account.\n`)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      console.error(`❌ User with email ${email} not found`)
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

