import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'boycotterapp@gmail.com'
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          org: true
        }
      }
    }
  })

  if (!user) {
    console.error(`❌ User with email ${email} not found`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.name || user.email}`)
  console.log(`   User ID: ${user.id}`)
  console.log(`   Organizations: ${user.memberships.length}`)

  // Find suspended organizations
  const suspendedOrgs = user.memberships.filter(m => m.org.status === 'SUSPENDED')
  
  if (suspendedOrgs.length === 0) {
    console.log('✅ No suspended organizations found for this user')
    process.exit(0)
  }

  console.log(`\n⚠️  Found ${suspendedOrgs.length} suspended organization(s):`)
  
  for (const membership of suspendedOrgs) {
    const org = membership.org
    console.log(`\n   Organization: ${org.name}`)
    console.log(`   ID: ${org.id}`)
    console.log(`   Status: ${org.status}`)
    console.log(`   Suspended At: ${org.suspendedAt?.toISOString() || 'N/A'}`)
    console.log(`   Reason: ${org.suspendedReason || 'N/A'}`)
    
    // Reactivate the organization
    console.log(`\n   🔄 Reactivating organization...`)
    
    await prisma.org.update({
      where: { id: org.id },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedReason: null,
        pausedAt: null,
        pausedReason: null,
        paymentFailureCount: 0
      }
    })

    console.log(`   ✅ Organization "${org.name}" has been reactivated!`)
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: user.id,
        action: 'ORG_REACTIVATED',
        targetType: 'ORG',
        targetId: org.id,
        data: JSON.stringify({
          orgName: org.name,
          reactivatedBy: user.email,
          reason: 'Manual reactivation via script'
        })
      }
    })
  }

  console.log('\n✅ All suspended organizations have been reactivated!')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



