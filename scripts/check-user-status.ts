import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUserStatus(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        UserOrgMembership: {
          include: {
            Org: {
              select: {
                id: true,
                name: true,
                slug: true
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

    console.log('\n=== User Status ===')
    console.log(`Email: ${user.email}`)
    console.log(`Name: ${user.name}`)
    console.log(`isSuperAdmin: ${user.isSuperAdmin}`)
    console.log(`\n=== Org Memberships ===`)
    
    if (user.UserOrgMembership.length === 0) {
      console.log('No org memberships found')
    } else {
      user.UserOrgMembership.forEach((membership) => {
        console.log(`- Org: ${membership.Org?.name || 'Unknown'} (${membership.Org?.slug || 'no-slug'})`)
        console.log(`  Role: ${membership.role}`)
        console.log(`  Org ID: ${membership.orgId}`)
      })
    }

    // Check role hints
    const orgAdminOf: string[] = []
    const orgStaffOf: string[] = []
    
    for (const membership of user.UserOrgMembership) {
      if (membership.Org) {
        if (membership.role === 'ADMIN') {
          orgAdminOf.push(membership.orgId)
          if (!orgStaffOf.includes(membership.orgId)) {
            orgStaffOf.push(membership.orgId)
          }
        } else if (membership.role === 'STAFF') {
          if (!orgStaffOf.includes(membership.orgId)) {
            orgStaffOf.push(membership.orgId)
          }
        }
      }
    }

    console.log(`\n=== Role Hints ===`)
    console.log(`isOwner: ${user.isSuperAdmin}`)
    console.log(`orgAdminOf: [${orgAdminOf.join(', ')}]`)
    console.log(`orgStaffOf: [${orgStaffOf.join(', ')}]`)

    if (user.isSuperAdmin) {
      console.log(`\n⚠️  WARNING: User is a super admin (owner). They will be redirected to /owner portal.`)
      console.log(`   To fix: Set isSuperAdmin to false if this should be an org admin account.`)
    } else if (orgAdminOf.length > 0) {
      console.log(`\n✅ User is an org admin and should be able to access /staff routes`)
    } else if (orgStaffOf.length > 0) {
      console.log(`\n✅ User is org staff and should be able to access /staff routes`)
    } else {
      console.log(`\n⚠️  User has no org admin/staff memberships`)
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
  console.log('Usage: npx tsx scripts/check-user-status.ts <email>')
  process.exit(1)
}

checkUserStatus(email)

