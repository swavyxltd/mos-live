import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Find Staff User
    const staffUser = await prisma.user.findUnique({
      where: { email: 'staff@test.com' }
    })

    if (!staffUser) {
      console.log('Staff User not found')
      return
    }

    // Find Test Islamic School org
    const demoOrg = await prisma.org.findFirst({
      where: {
        OR: [
          { slug: 'test-islamic-school' },
          { name: { contains: 'Test Islamic School', mode: 'insensitive' } },
          { slug: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    })

    if (!demoOrg) {
      console.log('Test Islamic School org not found')
      return
    }

    // Check if membership already exists
    const existingMembership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: staffUser.id,
          orgId: demoOrg.id
        }
      }
    })

    if (existingMembership) {
      console.log('Staff User already has membership in Test Islamic School')
      return
    }

    // Create membership
    await prisma.userOrgMembership.create({
      data: {
        id: `staff-${demoOrg.id}-${Date.now()}`,
        userId: staffUser.id,
        orgId: demoOrg.id,
        role: 'STAFF',
        isInitialAdmin: false
      }
    })

    console.log(`Successfully linked Staff User (${staffUser.email}) to Test Islamic School (${demoOrg.name})`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()



