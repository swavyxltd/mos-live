import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n📋 All Accounts in Database:\n')
  console.log('─'.repeat(80))
  
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          org: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  users.forEach((user, index) => {
    const orgs = user.memberships.map(m => `${m.org.name} (${m.role})`).join(', ') || 'No organisation'
    const hasPassword = user.password ? 'Yes' : 'No'
    
    console.log(`\n${index + 1}. ${user.name || 'N/A'} (${user.email})`)
    console.log(`   Owner: ${user.isSuperAdmin ? '✅ Yes' : '❌ No'}`)
    console.log(`   Password: ${hasPassword}`)
    console.log(`   Phone: ${user.phone || 'N/A'}`)
    console.log(`   Organisations: ${orgs}`)
    console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`)
  })

  console.log('\n' + '─'.repeat(80))
  console.log(`\nTotal: ${users.length} accounts\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

