import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteTestMadrasahOrgs() {
  try {
    console.log('🔍 Searching for "Test Madrasah" organisations...\n')
    
    // Find all organisations with "Test Madrasah" in the name
    const orgs = await prisma.org.findMany({
      where: {
        name: {
          contains: 'Test Madrasah',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        slug: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (orgs.length === 0) {
      console.log('❌ No organisations found with "Test Madrasah" in the name')
      process.exit(0)
    }

    console.log(`📊 Found ${orgs.length} organisation(s):\n`)
    orgs.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name} (${org.slug})`)
      console.log(`      ID: ${org.id}`)
    })

    // Get counts for each org
    console.log('\n📈 Gathering related data counts...\n')
    for (const org of orgs) {
      const [
        students,
        classes,
        invoices,
        memberships,
        applications,
        leads,
        users
      ] = await Promise.all([
        prisma.student.count({ where: { orgId: org.id } }),
        prisma.class.count({ where: { orgId: org.id } }),
        prisma.invoice.count({ where: { orgId: org.id } }),
        prisma.userOrgMembership.count({ where: { orgId: org.id } }),
        prisma.application.count({ where: { orgId: org.id } }),
        prisma.lead.count({ where: { convertedOrgId: org.id } }),
        prisma.userOrgMembership.findMany({
          where: { orgId: org.id },
          select: { userId: true }
        })
      ])

      const userIds = users.map(u => u.userId)
      const userEmails = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { email: true }
          })
        : []

      console.log(`   ${org.name}:`)
      console.log(`      Students: ${students}`)
      console.log(`      Classes: ${classes}`)
      console.log(`      Invoices: ${invoices}`)
      console.log(`      Memberships: ${memberships}`)
      console.log(`      Applications: ${applications}`)
      console.log(`      Leads (converted): ${leads}`)
      if (userEmails.length > 0) {
        console.log(`      Users: ${userEmails.map(u => u.email).join(', ')}`)
      }
      console.log('')
    }

    console.log('⚠️  WARNING: This will delete the organisations and ALL related data!')
    console.log('   This includes:')
    console.log('   - All students, classes, invoices, applications')
    console.log('   - All user memberships')
    console.log('   - All leads that were converted from these organisations')
    console.log('   - All associated emails, teachers, parents, etc.')
    console.log('   This action cannot be undone.\n')

    // Proceed with deletion
    console.log('🗑️  Starting deletion process...\n')

    for (const org of orgs) {
      console.log(`\n📦 Processing: ${org.name} (${org.slug})`)

      // Find and delete leads associated with this org
      const leads = await prisma.lead.findMany({
        where: { convertedOrgId: org.id },
        select: {
          id: true,
          orgName: true,
          contactEmail: true
        }
      })

      if (leads.length > 0) {
        console.log(`   🗑️  Deleting ${leads.length} lead(s)...`)
        for (const lead of leads) {
          // Delete lead activities first (cascade should handle this, but being explicit)
          await prisma.leadActivity.deleteMany({ where: { leadId: lead.id } })
          await prisma.lead.delete({ where: { id: lead.id } })
          console.log(`      ✅ Deleted lead: ${lead.orgName}${lead.contactEmail ? ` (${lead.contactEmail})` : ''}`)
        }
      }

      // Get counts before deletion for logging
      const [
        students,
        classes,
        invoices,
        memberships,
        applications
      ] = await Promise.all([
        prisma.student.count({ where: { orgId: org.id } }),
        prisma.class.count({ where: { orgId: org.id } }),
        prisma.invoice.count({ where: { orgId: org.id } }),
        prisma.userOrgMembership.count({ where: { orgId: org.id } }),
        prisma.application.count({ where: { orgId: org.id } })
      ])

      console.log(`   📊 Related records to be deleted:`)
      console.log(`      Students: ${students}`)
      console.log(`      Classes: ${classes}`)
      console.log(`      Invoices: ${invoices}`)
      console.log(`      Memberships: ${memberships}`)
      console.log(`      Applications: ${applications}`)

      // Delete the organisation (Prisma will cascade delete all related records)
      console.log(`   🗑️  Deleting organisation...`)
      await prisma.org.delete({
        where: { id: org.id }
      })

      console.log(`   ✅ Organisation "${org.name}" deleted successfully!`)
      console.log(`      All related records have been cascade deleted.`)
    }

    console.log(`\n✅ All "Test Madrasah" organisations and associated data deleted successfully!`)
    console.log(`   Total organisations deleted: ${orgs.length}`)

  } catch (error: any) {
    console.error('\n❌ Error deleting organisations:', error.message)
    console.error('   Stack:', error.stack)
    
    if (error.code === 'P2003') {
      console.error('   This error usually means there are foreign key constraints.')
      console.error('   Check the Prisma schema for cascade delete settings.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteTestMadrasahOrgs()
