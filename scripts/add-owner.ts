import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import * as readline from 'readline'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('\n🔧 Add New Owner Account\n')
  
  const email = await question('Email: ')
  if (!email) {
    console.error('❌ Email is required')
    process.exit(1)
  }

  const name = await question('Name (optional): ') || email.split('@')[0]
  
  const password = await question('Password: ')
  if (!password) {
    console.error('❌ Password is required')
    process.exit(1)
  }

  const confirmPassword = await question('Confirm Password: ')
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    const owner = await prisma.user.upsert({
      where: { email },
      update: {
        isSuperAdmin: true,
        name,
        password: hashedPassword,
      },
      create: {
        email,
        name,
        isSuperAdmin: true,
        password: hashedPassword,
      },
    })

    console.log('\n✅ Owner account created/updated successfully!')
    console.log(`   Email: ${owner.email}`)
    console.log(`   Name: ${owner.name}`)
    console.log(`   Super Admin: ${owner.isSuperAdmin}`)
    console.log(`   ID: ${owner.id}`)
    console.log('\n📝 You can now sign in with these credentials\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main()

