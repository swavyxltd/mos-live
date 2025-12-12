import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import crypto from 'crypto'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const name = process.argv[3]

  if (!email) {
    console.error('❌ Email is required')
    console.error('Usage: tsx scripts/add-owner-simple.ts <email> [name]')
    process.exit(1)
  }

  try {
    const owner = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        isSuperAdmin: true,
        name: name || email.split('@')[0],
      },
      create: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        isSuperAdmin: true,
        updatedAt: new Date(),
      },
    })

    console.log('\n✅ Owner account created/updated successfully!')
    console.log(`   Email: ${owner.email}`)
    console.log(`   Name: ${owner.name}`)
    console.log(`   Super Admin: ${owner.isSuperAdmin}`)
    console.log(`   ID: ${owner.id}`)
    console.log('\n📝 Note: Password must be set via password reset or invitation system.\n')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

