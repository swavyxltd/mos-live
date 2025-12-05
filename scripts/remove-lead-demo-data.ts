import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Removing demo lead data...')

  // List of demo lead organization names from the demo data script
  const demoOrgNames = [
    'Masjid Al-Falah',
    'Islamic Centre Manchester',
    'Darul Uloom Leicester',
    'Al-Huda Academy',
    'Madrasah Al-Noor',
    'Islamic School Leeds',
    'Quran Academy Sheffield',
    'Al-Amin Madrasah',
  ]

  // Find all demo leads
  const demoLeads = await prisma.lead.findMany({
    where: {
      orgName: {
        in: demoOrgNames,
      },
    },
    select: {
      id: true,
      orgName: true,
    },
  })

  if (demoLeads.length === 0) {
    console.log('✅ No demo leads found in database')
    await prisma.$disconnect()
    return
  }

  console.log(`📦 Found ${demoLeads.length} demo leads to delete`)

  // Delete lead activities first (due to foreign key constraints)
  const leadIds = demoLeads.map(lead => lead.id)
  const activitiesDeleted = await prisma.leadActivity.deleteMany({
    where: {
      leadId: {
        in: leadIds,
      },
    },
  })
  console.log(`   ✓ Deleted ${activitiesDeleted.count} lead activities`)

  // Delete the leads
  const leadsDeleted = await prisma.lead.deleteMany({
    where: {
      id: {
        in: leadIds,
      },
    },
  })
  console.log(`   ✓ Deleted ${leadsDeleted.count} demo leads`)

  console.log('\n✅ Demo lead data removed successfully!')
  console.log(`\nSummary:`)
  console.log(`- Deleted ${leadsDeleted.count} demo leads`)
  console.log(`- Deleted ${activitiesDeleted.count} associated activities`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

