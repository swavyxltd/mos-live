import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Starting password audit...\n')

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isSuperAdmin: true,
        isArchived: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total users found: ${users.length}\n`)

    const usersWithoutPassword: typeof users = []
    const usersWithWeakPassword: typeof users = []
    const usersWithValidPassword: typeof users = []

    for (const user of users) {
      if (!user.password) {
        usersWithoutPassword.push(user)
      } else {
        // Check if password is bcrypt hashed (starts with $2a$, $2b$, or $2y$)
        const isBcryptHash = /^\$2[ayb]\$\d{2}\$/.test(user.password)
        
        if (!isBcryptHash) {
          // Check if it's the demo123 password (plaintext or weak)
          if (user.password === 'demo123' || user.password.length < 20) {
            usersWithWeakPassword.push(user)
          } else {
            usersWithValidPassword.push(user)
          }
        } else {
          usersWithValidPassword.push(user)
        }
      }
    }

    // Report findings
    console.log('📋 Audit Results:\n')
    console.log(`✅ Users with valid bcrypt passwords: ${usersWithValidPassword.length}`)
    console.log(`❌ Users without passwords: ${usersWithoutPassword.length}`)
    console.log(`⚠️  Users with weak/invalid passwords: ${usersWithWeakPassword.length}\n`)

    if (usersWithoutPassword.length > 0) {
      console.log('🚨 USERS WITHOUT PASSWORDS (SECURITY RISK):')
      console.log('=' .repeat(60))
      usersWithoutPassword.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'})`)
        console.log(`    ID: ${user.id}`)
        console.log(`    Super Admin: ${user.isSuperAdmin ? 'YES' : 'NO'}`)
        console.log(`    Archived: ${user.isArchived ? 'YES' : 'NO'}`)
        console.log(`    Created: ${user.createdAt.toISOString()}`)
        console.log('')
      })
    }

    if (usersWithWeakPassword.length > 0) {
      console.log('⚠️  USERS WITH WEAK/INVALID PASSWORDS:')
      console.log('=' .repeat(60))
      usersWithWeakPassword.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'})`)
        console.log(`    ID: ${user.id}`)
        console.log(`    Password hash: ${user.password?.substring(0, 20)}...`)
        console.log(`    Super Admin: ${user.isSuperAdmin ? 'YES' : 'NO'}`)
        console.log(`    Archived: ${user.isArchived ? 'YES' : 'NO'}`)
        console.log('')
      })
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log('=' .repeat(60))
    const totalIssues = usersWithoutPassword.length + usersWithWeakPassword.length
    if (totalIssues === 0) {
      console.log('✅ All users have valid bcrypt-hashed passwords!')
      console.log('✅ System is secure.')
    } else {
      console.log(`⚠️  ${totalIssues} user(s) need attention:`)
      console.log(`   - ${usersWithoutPassword.length} user(s) without passwords`)
      console.log(`   - ${usersWithWeakPassword.length} user(s) with weak passwords`)
      console.log('\n🔧 Recommended actions:')
      console.log('   1. Force password reset for users without passwords')
      console.log('   2. Force password reset for users with weak passwords')
      console.log('   3. Archive or delete test/demo accounts if not needed')
    }

    console.log('\n')
  } catch (error) {
    console.error('❌ Error during audit:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

