import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixAdminAccount(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        UserOrgMembership: {
          include: {
            Org: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      console.log(`User with email ${email} not found`)
      return
    }

    console.log(`\n=== Current Status ===`)
    console.log(`Email: ${user.email}`)
    console.log(`Name: ${user.name}`)
    console.log(`isSuperAdmin: ${user.isSuperAdmin}`)
    console.log(`Org Memberships: ${user.UserOrgMembership.length}`)

    if (user.isSuperAdmin) {
      console.log(`\n⚠️  User is currently a super admin (owner)`)
      console.log(`   Fixing: Setting isSuperAdmin to false...`)
      
      await prisma.user.update({
        where: { email },
        data: {
          isSuperAdmin: false
        }
      })

      console.log(`✅ Fixed! User is now an org admin (not an owner)`)
      console.log(`   Please sign out and sign back in to refresh your session.`)
    } else {
      console.log(`\n✅ User is already not a super admin`)
    }

    // Verify org memberships
    const adminMemberships = user.UserOrgMembership.filter(m => m.role === 'ADMIN')
    if (adminMemberships.length === 0) {
      console.log(`\n⚠️  WARNING: User has no ADMIN role memberships`)
      console.log(`   They need an ADMIN role in an org to access /staff routes`)
    } else {
      console.log(`\n✅ User has ${adminMemberships.length} ADMIN role membership(s)`)
      adminMemberships.forEach(m => {
        console.log(`   - ${m.Org?.name || 'Unknown Org'} (${m.orgId})`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line args
const email = process.argv[2]

if (!email) {
  console.log('Usage: npx tsx scripts/fix-admin-account.ts <email>')
  process.exit(1)
}

fixAdminAccount(email)

