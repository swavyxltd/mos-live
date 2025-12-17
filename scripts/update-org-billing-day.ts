import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const orgName = process.argv[2] || 'test islamic school'
  const billingDay = parseInt(process.argv[3] || '15')

  if (billingDay < 1 || billingDay > 31) {
    console.error('❌ Billing day must be between 1 and 31')
    process.exit(1)
  }

  try {
    console.log(`🔍 Searching for organisation: "${orgName}"...\n`)

    const org = await prisma.org.findFirst({
      where: {
        name: {
          contains: orgName,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billingDay: true,
        feeDueDay: true
      }
    })

    if (!org) {
      console.error(`❌ Organisation "${orgName}" not found`)
      process.exit(1)
    }

    console.log(`📊 Found organisation:`)
    console.log(`   Name: ${org.name}`)
    console.log(`   Slug: ${org.slug}`)
    console.log(`   ID: ${org.id}`)
    console.log(`   Current billingDay: ${org.billingDay ?? 'null'}`)
    console.log(`   Current feeDueDay: ${org.feeDueDay ?? 'null'}`)
    console.log(`\n🔄 Updating billingDay to ${billingDay}...\n`)

    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        billingDay: billingDay,
        feeDueDay: billingDay, // Also update feeDueDay for consistency
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billingDay: true,
        feeDueDay: true
      }
    })

    console.log('✅ Organisation updated successfully!')
    console.log(`   Name: ${updatedOrg.name}`)
    console.log(`   Slug: ${updatedOrg.slug}`)
    console.log(`   billingDay: ${updatedOrg.billingDay}`)
    console.log(`   feeDueDay: ${updatedOrg.feeDueDay}`)
    console.log('\n📝 Payment date is now set to the 15th of each month.\n')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error:', message)
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
