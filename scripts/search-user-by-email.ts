import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function searchUser() {
  try {
    const searchTerm = process.argv[2] || 'boycotterapp'
    
    console.log(`🔍 Searching for users with email containing: "${searchTerm}"...\n`)
    
    // Search for users with email containing the term
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isArchived: true
      }
    })

    if (users.length === 0) {
      console.log(`❌ No users found with email containing "${searchTerm}"`)
      
      // Also check in other tables
      console.log(`\n🔍 Checking other tables...`)
      
      const applications = await prisma.application.findMany({
        where: {
          OR: [
            { guardianEmail: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          guardianEmail: true,
          guardianName: true
        },
        take: 10
      })

      if (applications.length > 0) {
        console.log(`\n📋 Found in Applications:`)
        applications.forEach(app => {
          console.log(`   - ${app.guardianEmail} (${app.guardianName})`)
        })
      }

      process.exit(1)
    }

    console.log(`✅ Found ${users.length} user(s):\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.name || 'N/A'}`)
      console.log(`   Created: ${user.createdAt.toISOString()}`)
      console.log(`   Archived: ${user.isArchived ? 'Yes' : 'No'}`)
      console.log('')
    })

  } catch (error: any) {
    console.error('\n❌ Error searching for user:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

searchUser()

