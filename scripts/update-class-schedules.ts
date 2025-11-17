import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating class schedules for admin@test.com...\n')

  // Find the organization for admin@test.com
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@test.com' },
    include: {
      UserOrgMembership: {
        include: {
          Org: true
        }
      }
    }
  })

  if (!adminUser) {
    console.error('❌ admin@test.com not found')
    process.exit(1)
  }

  const org = adminUser.UserOrgMembership[0]?.Org
  if (!org) {
    console.error('❌ No organization found for admin@test.com')
    process.exit(1)
  }

  console.log(`📋 Found organization: ${org.name} (${org.id})\n`)

  // Get all classes for this organization
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id
    }
  })

  if (classes.length === 0) {
    console.log('⚠️  No classes found to update')
    process.exit(0)
  }

  console.log(`📚 Found ${classes.length} classes to update\n`)

  // Update each class schedule
  const newSchedule = {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '5:00 PM',
    endTime: '7:00 PM'
  }

  for (const classItem of classes) {
    await prisma.class.update({
      where: { id: classItem.id },
      data: {
        schedule: JSON.stringify(newSchedule),
        updatedAt: new Date()
      }
    })
    console.log(`   ✅ Updated: ${classItem.name}`)
  }

  console.log(`\n✅ Successfully updated ${classes.length} classes to Monday-Friday 5pm-7pm`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

