import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteOrg() {
  try {
    const orgName = process.argv[2] || 'Test Madrasah Live'
    
    console.log(`Searching for organization: "${orgName}"...`)
    
    // Find the organization
    const org = await prisma.org.findFirst({
      where: {
        name: {
          contains: orgName,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    if (!org) {
      console.error(`❌ Organization "${orgName}" not found`)
      process.exit(1)
    }

    console.log(`\nFound organization:`)
    console.log(`  ID: ${org.id}`)
    console.log(`  Name: ${org.name}`)
    console.log(`  Slug: ${org.slug}`)
    
    // Get counts of related records
    const [students, classes, invoices, memberships, applications] = await Promise.all([
      prisma.student.count({ where: { orgId: org.id } }),
      prisma.class.count({ where: { orgId: org.id } }),
      prisma.invoice.count({ where: { orgId: org.id } }),
      prisma.userOrgMembership.count({ where: { orgId: org.id } }),
      prisma.application.count({ where: { orgId: org.id } })
    ])

    console.log(`\nRelated records:`)
    console.log(`  Students: ${students}`)
    console.log(`  Classes: ${classes}`)
    console.log(`  Invoices: ${invoices}`)
    console.log(`  Memberships: ${memberships}`)
    console.log(`  Applications: ${applications}`)

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will delete the organization and ALL related data!`)
    console.log(`   This action cannot be undone.`)
    
    // For script usage, we'll proceed (in production, you'd want confirmation)
    console.log(`\nDeleting organization...`)
    
    // Delete the organization (Prisma will cascade delete all related records)
    await prisma.org.delete({
      where: { id: org.id }
    })

    console.log(`\n✅ Organization "${org.name}" deleted successfully!`)
    console.log(`   All related records have been cascade deleted.`)

  } catch (error: any) {
    console.error('\n❌ Error deleting organization:', error.message)
    
    if (error.code === 'P2003') {
      console.error('   This error usually means there are foreign key constraints.')
      console.error('   Check the Prisma schema for cascade delete settings.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteOrg()

