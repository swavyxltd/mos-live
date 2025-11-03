import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const slug = 'masjid-al-falah'
  
  console.log(`🔍 Looking for organization with slug: ${slug}`)
  
  const org = await prisma.org.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          students: true,
          classes: true,
          memberships: true,
          invoices: true
        }
      }
    }
  })

  if (!org) {
    console.log(`❌ Organization with slug "${slug}" not found`)
    process.exit(1)
  }

  console.log(`\n📋 Found organization:`)
  console.log(`   Name: ${org.name}`)
  console.log(`   Slug: ${org.slug}`)
  console.log(`   ID: ${org.id}`)
  console.log(`\n📊 Related data:`)
  console.log(`   Students: ${org._count.students}`)
  console.log(`   Classes: ${org._count.classes}`)
  console.log(`   Memberships: ${org._count.memberships}`)
  console.log(`   Invoices: ${org._count.invoices}`)
  console.log(`\n⚠️  This will DELETE all related data (cascade delete)`)
  console.log(`\n🗑️  Deleting organization...`)

  try {
    await prisma.org.delete({
      where: { id: org.id }
    })
    
    console.log(`\n✅ Organization "${org.name}" deleted successfully!`)
  } catch (error: any) {
    console.error(`\n❌ Error deleting organization:`, error)
    if (error.code === 'P2003') {
      console.error(`   Cannot delete due to foreign key constraints`)
    }
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

