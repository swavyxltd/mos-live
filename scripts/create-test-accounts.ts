import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating owner and admin accounts...\n')

  const hashedPassword = await bcrypt.hash('Trentlfc66!', 12)
  const demoPassword = await bcrypt.hash('demo123', 12)

  // Create owner account
  const owner = await prisma.user.upsert({
    where: { email: 'swavyxltd@gmail.com' },
    update: {
      isSuperAdmin: true,
      name: 'Platform Owner',
      password: hashedPassword,
    },
    create: {
      email: 'swavyxltd@gmail.com',
      name: 'Platform Owner',
      isSuperAdmin: true,
      password: hashedPassword,
    },
  })

  console.log('✅ Owner account created/updated:')
  console.log('   - Email:', owner.email)
  console.log('   - Password: Trentlfc66!')
  console.log('   - Super Admin:', owner.isSuperAdmin)

  // Create test organization
  const org = await prisma.org.upsert({
    where: { slug: 'test-islamic-school' },
    update: {},
    create: {
      name: 'Test Islamic School',
      slug: 'test-islamic-school',
      timezone: 'Europe/London',
      settings: JSON.stringify({ lateThreshold: 15 }),
      status: 'ACTIVE',
    },
  })

  console.log('\n✅ Test organization created:', org.name)

  // Create admin account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      name: 'Admin User',
      password: demoPassword,
    },
    create: {
      email: 'admin@test.com',
      name: 'Admin User',
      phone: '+44 7700 900100',
      password: demoPassword,
    },
  })

  console.log('\n✅ Admin account created/updated:')
  console.log('   - Email:', admin.email)
  console.log('   - Password: demo123')

  // Link admin to org
  await prisma.userOrgMembership.upsert({
    where: {
      userId_orgId: {
        userId: admin.id,
        orgId: org.id,
      },
    },
    update: {
      role: 'ADMIN',
    },
    create: {
      userId: admin.id,
      orgId: org.id,
      role: 'ADMIN',
    },
  })

  console.log('   - Linked to organization:', org.name)
  console.log('\n✅ Setup complete!')
  console.log('\n📝 Login credentials:')
  console.log('Owner:')
  console.log('   Email: swavyxltd@gmail.com')
  console.log('   Password: Trentlfc66!')
  console.log('\nAdmin:')
  console.log('   Email: admin@test.com')
  console.log('   Password: demo123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

