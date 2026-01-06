import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const email = 'teacher@test.com'
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      console.error('Teacher user not found')
      process.exit(1)
    }

    // Find Test Islamic School org
    const org = await prisma.org.findFirst({
      where: {
        name: {
          contains: 'Test Islamic School',
          mode: 'insensitive'
        }
      }
    })

    if (!org) {
      console.error('Test Islamic School org not found')
      process.exit(1)
    }

    // Find a class in the org (or create one if none exists)
    let classToAssign = await prisma.class.findFirst({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })

    if (!classToAssign) {
      // Create a test class
      classToAssign = await prisma.class.create({
        data: {
          id: crypto.randomUUID(),
          orgId: org.id,
          name: 'Test Class',
          description: 'Test class for teacher',
          teacherId: user.id,
          schedule: JSON.stringify({
            days: ['Monday', 'Wednesday', 'Friday'],
            startTime: '16:00',
            endTime: '17:00'
          }),
          monthlyFeeP: 2000, // £20.00
          isArchived: false
        }
      })
      console.log('Created test class:', classToAssign.name)
    } else {
      // Assign existing class to teacher
      await prisma.class.update({
        where: { id: classToAssign.id },
        data: {
          teacherId: user.id
        }
      })
      console.log('Assigned class to teacher:', classToAssign.name)
    }

    console.log('✅ Class assigned successfully!')
    console.log(`Teacher: ${user.name} (${user.email})`)
    console.log(`Class: ${classToAssign.name}`)
  } catch (error) {
    console.error('Error assigning class:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

