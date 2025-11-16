import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

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
      id: randomUUID(),
      email: 'swavyxltd@gmail.com',
      name: 'Platform Owner',
      isSuperAdmin: true,
      password: hashedPassword,
      updatedAt: new Date(),
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
      id: randomUUID(),
      name: 'Test Islamic School',
      slug: 'test-islamic-school',
      timezone: 'Europe/London',
      settings: JSON.stringify({ lateThreshold: 15 }),
      status: 'ACTIVE',
      updatedAt: new Date(),
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
      id: randomUUID(),
      email: 'admin@test.com',
      name: 'Admin User',
      phone: '+44 7700 900100',
      password: demoPassword,
      updatedAt: new Date(),
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
      id: randomUUID(),
      userId: admin.id,
      orgId: org.id,
      role: 'ADMIN',
    },
  })

  console.log('   - Linked to organization:', org.name)

  // Create a demo class for applications
  let demoClass = await prisma.class.findFirst({
    where: { orgId: org.id, isArchived: false }
  })

  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        id: randomUUID(),
        orgId: org.id,
        name: 'Quran Recitation - Level 1',
        description: 'Basic Quran recitation and memorization',
        schedule: JSON.stringify({
          days: ['Monday', 'Wednesday', 'Friday'],
          startTime: '4:00 PM',
          endTime: '5:30 PM'
        }),
        monthlyFeeP: 2500, // £25.00
        updatedAt: new Date(),
      }
    })
    console.log('\n✅ Created demo class:', demoClass.name)
  }

  // Create 5 demo applications
  const demoApplications = [
    {
      guardianName: 'Ahmed Hassan',
      guardianPhone: '+44 7700 900123',
      guardianEmail: 'ahmed.hassan@example.com',
      guardianAddress: '123 High Street, London, UK',
      children: [
        { firstName: 'Hassan', lastName: 'Hassan', dob: new Date(2015, 2, 15), gender: 'Male' },
        { firstName: 'Amina', lastName: 'Hassan', dob: new Date(2017, 7, 22), gender: 'Female' }
      ],
      preferredClass: demoClass.name,
      additionalNotes: 'Both children are eager to learn and have been practicing at home.',
      status: 'NEW'
    },
    {
      guardianName: 'Fatima Ali',
      guardianPhone: '+44 7700 900124',
      guardianEmail: 'fatima.ali@example.com',
      guardianAddress: '456 Main Road, London, UK',
      children: [
        { firstName: 'Yusuf', lastName: 'Ali', dob: new Date(2016, 10, 10), gender: 'Male' }
      ],
      preferredClass: demoClass.name,
      additionalNotes: 'Yusuf has been reading Arabic books and is very interested in Islamic history.',
      status: 'REVIEWED'
    },
    {
      guardianName: 'Mohammed Khan',
      guardianPhone: '+44 7700 900125',
      guardianEmail: 'mohammed.khan@example.com',
      guardianAddress: '789 Park Avenue, London, UK',
      children: [
        { firstName: 'Aisha', lastName: 'Khan', dob: new Date(2014, 6, 18), gender: 'Female' },
        { firstName: 'Omar', lastName: 'Khan', dob: new Date(2018, 11, 3), gender: 'Male' }
      ],
      preferredClass: demoClass.name,
      additionalNotes: 'Family is very committed to Islamic education. Both parents are teachers.',
      status: 'ACCEPTED'
    },
    {
      guardianName: 'Sarah Ahmed',
      guardianPhone: '+44 7700 900126',
      guardianEmail: 'sarah.ahmed@example.com',
      guardianAddress: '321 Oak Street, London, UK',
      children: [
        { firstName: 'Zainab', lastName: 'Ahmed', dob: new Date(2019, 3, 25), gender: 'Female' }
      ],
      preferredClass: demoClass.name,
      additionalNotes: 'Zainab has already memorized several short surahs at home.',
      status: 'NEW'
    },
    {
      guardianName: 'Ibrahim Malik',
      guardianPhone: '+44 7700 900127',
      guardianEmail: 'ibrahim.malik@example.com',
      guardianAddress: '654 Elm Drive, London, UK',
      children: [
        { firstName: 'Hamza', lastName: 'Malik', dob: new Date(2015, 8, 12), gender: 'Male' },
        { firstName: 'Maryam', lastName: 'Malik', dob: new Date(2017, 1, 8), gender: 'Female' }
      ],
      preferredClass: demoClass.name,
      additionalNotes: 'Both children are very enthusiastic about learning Arabic and Quran.',
      status: 'REVIEWED'
    }
  ]

  console.log('\n📝 Creating demo applications...')
  let applicationCount = 0

  for (const appData of demoApplications) {
    try {
      // Check if application already exists
      const existing = await prisma.application.findFirst({
        where: {
          orgId: org.id,
          guardianEmail: appData.guardianEmail
        }
      })

      if (existing) {
        console.log(`   ⏭️  Application already exists: ${appData.guardianName}`)
        continue
      }

      const submittedDate = new Date()
      submittedDate.setDate(submittedDate.getDate() - (applicationCount * 2))

      const application = await prisma.application.create({
        data: {
          id: randomUUID(),
          orgId: org.id,
          status: appData.status,
          guardianName: appData.guardianName,
          guardianPhone: appData.guardianPhone,
          guardianEmail: appData.guardianEmail,
          guardianAddress: appData.guardianAddress,
          preferredClass: appData.preferredClass,
          additionalNotes: appData.additionalNotes,
          submittedAt: submittedDate,
          updatedAt: submittedDate,
          ApplicationChild: {
            create: appData.children.map((child, idx) => ({
              id: randomUUID(),
              firstName: child.firstName,
              lastName: child.lastName,
              dob: child.dob,
              gender: child.gender,
              updatedAt: new Date()
            }))
          }
        }
      })

      applicationCount++
      console.log(`   ✅ Created application: ${appData.guardianName} (${appData.status}, ${appData.children.length} child/ren)`)
    } catch (error) {
      console.error(`   ⚠️  Error creating application for ${appData.guardianName}:`, error)
    }
  }

  console.log('\n✅ Setup complete!')
  console.log('\n📝 Login credentials:')
  console.log('Owner:')
  console.log('   Email: swavyxltd@gmail.com')
  console.log('   Password: Trentlfc66!')
  console.log('\nAdmin:')
  console.log('   Email: admin@test.com')
  console.log('   Password: demo123')
  console.log(`\n📋 Created ${applicationCount} demo applications`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

