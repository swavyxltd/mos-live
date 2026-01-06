import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  try {
    const email = 'teacher@test.com'
    const password = 'demo123'
    const name = 'Test Teacher'
    
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

    console.log(`Found org: ${org.name} (${org.id})`)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      console.log('User already exists, updating...')
      
      // Update password
      const hashedPassword = await bcrypt.hash(password, 12)
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          name: name,
          updatedAt: new Date()
        }
      })

      // Check membership
      const membership = await prisma.userOrgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: existingUser.id,
            orgId: org.id
          }
        }
      })

      if (membership) {
        // Update membership
        await prisma.userOrgMembership.update({
          where: { id: membership.id },
          data: {
            role: 'STAFF',
            staffSubrole: 'TEACHER'
          }
        })
        console.log('Updated membership')
      } else {
        // Create membership
        await prisma.userOrgMembership.create({
          data: {
            id: crypto.randomUUID(),
            userId: existingUser.id,
            orgId: org.id,
            role: 'STAFF',
            staffSubrole: 'TEACHER'
          }
        })
        console.log('Created membership')
      }

      console.log('✅ Teacher account updated successfully!')
      console.log(`Email: ${email}`)
      console.log(`Password: ${password}`)
      console.log(`Org: ${org.name}`)
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12)
      const userId = crypto.randomUUID()

      const user = await prisma.user.create({
        data: {
          id: userId,
          email: email.toLowerCase(),
          name: name,
          password: hashedPassword,
          isSuperAdmin: false,
          updatedAt: new Date()
        }
      })

      console.log('Created user:', user.id)

      // Create membership
      const membership = await prisma.userOrgMembership.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          orgId: org.id,
          role: 'STAFF',
          staffSubrole: 'TEACHER'
        }
      })

      console.log('Created membership:', membership.id)

      // Set teacher permissions
      const { setStaffPermissions, ensurePermissionsExist } = await import('../src/lib/staff-permissions-db')
      const { getStaffPermissionKeys } = await import('../src/types/staff-roles')
      
      await ensurePermissionsExist()
      const teacherPermissions = getStaffPermissionKeys('TEACHER')
      await setStaffPermissions(membership.id, teacherPermissions, 'TEACHER')

      console.log('✅ Teacher account created successfully!')
      console.log(`Email: ${email}`)
      console.log(`Password: ${password}`)
      console.log(`Org: ${org.name}`)
    }
  } catch (error) {
    console.error('Error creating teacher account:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

