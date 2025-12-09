import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function searchAllData() {
  try {
    const searchTerm = process.argv[2] || 'boycotterapp'
    
    console.log(`🔍 Searching ALL tables for: "${searchTerm}"...\n`)
    
    // Search in User table
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Search in Application table
    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { guardianEmail: { contains: searchTerm, mode: 'insensitive' } },
          { guardianName: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        guardianEmail: true,
        guardianName: true,
        orgId: true
      }
    })

    // Search in Lead table
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
          { contactName: { contains: searchTerm, mode: 'insensitive' } },
          { orgName: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        contactEmail: true,
        contactName: true,
        orgName: true
      }
    })

    // Search in Org table
    const orgs = await prisma.org.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { publicEmail: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        publicEmail: true
      }
    })

    console.log(`📊 Search Results:\n`)
    
    if (users.length > 0) {
      console.log(`👤 Users (${users.length}):`)
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.name || 'N/A'}) [ID: ${user.id}]`)
      })
      console.log('')
    }

    if (applications.length > 0) {
      console.log(`📝 Applications (${applications.length}):`)
      applications.forEach(app => {
        console.log(`   - ${app.guardianEmail} (${app.guardianName}) [ID: ${app.id}]`)
      })
      console.log('')
    }

    if (leads.length > 0) {
      console.log(`🎯 Leads (${leads.length}):`)
      leads.forEach(lead => {
        console.log(`   - ${lead.contactEmail || 'N/A'} (${lead.contactName || 'N/A'}) - ${lead.orgName} [ID: ${lead.id}]`)
      })
      console.log('')
    }

    if (orgs.length > 0) {
      console.log(`🏢 Organisations (${orgs.length}):`)
      orgs.forEach(org => {
        console.log(`   - ${org.name} (${org.email || org.publicEmail || 'N/A'}) [ID: ${org.id}]`)
      })
      console.log('')
    }

    if (users.length === 0 && applications.length === 0 && leads.length === 0 && orgs.length === 0) {
      console.log(`❌ No data found containing "${searchTerm}" in any table.`)
      console.log(`\n💡 The email may have been already deleted or never existed.`)
    } else {
      console.log(`\n✅ Found data in ${users.length + applications.length + leads.length + orgs.length} record(s)`)
    }

  } catch (error: any) {
    console.error('\n❌ Error searching:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

searchAllData()

