import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const email = 'boycotterapp@gmail.com'
  const password = 'demo1234'
  
  console.log(`\n🔧 Setting password for: ${email}\n`)
  
  const hashedPassword = await bcrypt.hash(password, 12)
  
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true
      }
    })
    
    console.log('✅ Password updated successfully!')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   Super Admin: ${user.isSuperAdmin}`)
    console.log(`\n📝 Password set to: ${password}\n`)
  } catch (error: any) {
    if (error.code === 'P2025') {
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

