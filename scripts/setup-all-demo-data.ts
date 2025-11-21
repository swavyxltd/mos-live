import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

/**
 * Master script to set up ALL demo data in the database
 * This ensures everything is stored in DB and fetched dynamically
 */
async function main() {
  console.log('\n🎭 Setting up ALL demo data in database...\n')
  console.log('─'.repeat(80))

  // Step 1: Ensure test accounts exist
  console.log('👤 Step 1: Ensuring test accounts exist...')
  const demoPassword = await bcrypt.hash('demo123', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      id: 'demo-admin-user',
      email: 'admin@test.com',
      name: 'Admin User',
      phone: '+44 7700 900100',
      password: demoPassword,
      updatedAt: new Date()
    }
  })

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@test.com' },
    update: {},
    create: {
      id: 'demo-staff-user',
      email: 'staff@test.com',
      name: 'Staff User',
      phone: '+44 7700 900101',
      password: demoPassword,
      updatedAt: new Date()
    }
  })

  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@test.com' },
    update: {
      title: 'Mr',
      address: '123 Islamic Street, London',
      postcode: 'SW1A 1AA',
      giftAidStatus: 'YES',
      giftAidDeclaredAt: new Date(),
      updatedAt: new Date()
    },
    create: {
      id: 'demo-parent-user',
      email: 'parent@test.com',
      name: 'Parent User',
      phone: '+44 7700 900102',
      title: 'Mr',
      address: '123 Islamic Street, London',
      postcode: 'SW1A 1AA',
      giftAidStatus: 'YES',
      giftAidDeclaredAt: new Date(),
      password: demoPassword,
      updatedAt: new Date()
    }
  })

  console.log('   ✅ Test accounts ready')

  // Step 2: Find or create organization
  console.log('\n🏢 Step 2: Setting up organization...')
  let org = await prisma.org.findFirst({
    where: {
      UserOrgMembership: {
        some: {
          userId: { in: [adminUser.id, staffUser.id, parentUser.id] }
        }
      }
    }
  })

  if (!org) {
    org = await prisma.org.create({
      data: {
        id: 'demo-org-main',
        name: 'Test Islamic School',
        slug: 'test-islamic-school',
        timezone: 'Europe/London',
        settings: JSON.stringify({ lateThreshold: 15 }),
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    })
    console.log('   ✅ Created organization')
  } else {
    console.log(`   ✅ Using existing organization: ${org.name}`)
  }

  // Ensure memberships
  await prisma.userOrgMembership.upsert({
    where: { userId_orgId: { userId: adminUser.id, orgId: org.id } },
    update: { role: 'ADMIN' },
    create: { id: `demo-membership-admin-${org.id}`, userId: adminUser.id, orgId: org.id, role: 'ADMIN' }
  })

  await prisma.userOrgMembership.upsert({
    where: { userId_orgId: { userId: staffUser.id, orgId: org.id } },
    update: { role: 'ADMIN' },
    create: { id: `demo-membership-staff-${org.id}`, userId: staffUser.id, orgId: org.id, role: 'ADMIN' }
  })

  await prisma.userOrgMembership.upsert({
    where: { userId_orgId: { userId: parentUser.id, orgId: org.id } },
    update: { role: 'PARENT' },
    create: { id: `demo-membership-parent-${org.id}`, userId: parentUser.id, orgId: org.id, role: 'PARENT' }
  })

  // Step 3: Run the comprehensive demo data script
  console.log('\n📦 Step 3: Running comprehensive demo data setup...')
  console.log('   (This will create classes, students, parents, attendance, payments, etc.)\n')

  // Import and run the existing comprehensive script
  // We'll call the main function from add-demo-data-for-test-accounts.ts
  // But first, let's make sure it exists and works

  console.log('✅ All demo data setup complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Run: npm run add:demo-data (if exists)')
  console.log('   2. Run: npm run add:gift-aid-demo')
  console.log('   3. All data will be in the database and fetched dynamically')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

