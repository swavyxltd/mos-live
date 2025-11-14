import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n🗑️  Removing payments demo data...\n')

  // Get active organization
  const org = await prisma.org.findFirst({
    where: { status: 'ACTIVE' }
  })

  if (!org) {
    console.error('❌ No active organization found')
    process.exit(1)
  }

  console.log(`✅ Found organization: ${org.name}`)

  // Identify demo classes by their names
  const demoClassNames = [
    'Quran Recitation - Level 1',
    'Islamic Studies - Level 2',
    'Arabic Language - Beginners'
  ]

  const demoClasses = await prisma.class.findMany({
    where: {
      orgId: org.id,
      name: { in: demoClassNames },
      description: { contains: 'Demo class' }
    }
  })

  console.log(`\n📦 Found ${demoClasses.length} demo classes`)

  if (demoClasses.length > 0) {
    // Get all students enrolled in these classes
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        orgId: org.id,
        classId: { in: demoClasses.map(c => c.id) }
      },
      include: {
        Student: true
      }
    })

    const demoStudentIds = [...new Set(studentClasses.map(sc => sc.studentId))]

    console.log(`📦 Found ${demoStudentIds.length} students in demo classes`)

    // Delete payment records for these students
    const paymentRecordsDeleted = await prisma.monthlyPaymentRecord.deleteMany({
      where: {
        orgId: org.id,
        studentId: { in: demoStudentIds }
      }
    })
    console.log(`   ✓ Deleted ${paymentRecordsDeleted.count} payment records`)

    // Delete student-class relationships
    const studentClassDeleted = await prisma.studentClass.deleteMany({
      where: {
        orgId: org.id,
        classId: { in: demoClasses.map(c => c.id) }
      }
    })
    console.log(`   ✓ Deleted ${studentClassDeleted.count} student-class relationships`)

    // Delete demo students
    const studentsDeleted = await prisma.student.deleteMany({
      where: {
        orgId: org.id,
        id: { in: demoStudentIds }
      }
    })
    console.log(`   ✓ Deleted ${studentsDeleted.count} students`)

    // Delete demo classes
    const classesDeleted = await prisma.class.deleteMany({
      where: {
        orgId: org.id,
        id: { in: demoClasses.map(c => c.id) }
      }
    })
    console.log(`   ✓ Deleted ${classesDeleted.count} classes`)
  }

  // Find and remove demo parents (those with @example.com emails)
  const demoParents = await prisma.user.findMany({
    where: {
      email: { contains: '@example.com' },
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: 'PARENT'
        }
      }
    },
    include: {
      Student: {
        where: { orgId: org.id }
      }
    }
  })

  // Only delete parents that have no remaining students
  const parentsToDelete = demoParents.filter(p => p.Student.length === 0)

  if (parentsToDelete.length > 0) {
    // Delete memberships first
    await prisma.userOrgMembership.deleteMany({
      where: {
        orgId: org.id,
        userId: { in: parentsToDelete.map(p => p.id) },
        role: 'PARENT'
      }
    })
    console.log(`   ✓ Deleted ${parentsToDelete.length} parent memberships`)

    // Delete the users
    await prisma.user.deleteMany({
      where: {
        id: { in: parentsToDelete.map(p => p.id) }
      }
    })
    console.log(`   ✓ Deleted ${parentsToDelete.length} demo parent accounts`)
  }

  // Find and remove demo teachers (those with @demo.com emails)
  const demoTeachers = await prisma.user.findMany({
    where: {
      email: { contains: '@demo.com' },
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] }
        }
      }
    },
    include: {
      Class: {
        where: { orgId: org.id }
      }
    }
  })

  // Only delete teachers that have no remaining classes
  const teachersToDelete = demoTeachers.filter(t => t.Class.length === 0)

  if (teachersToDelete.length > 0) {
    // Delete memberships first
    await prisma.userOrgMembership.deleteMany({
      where: {
        orgId: org.id,
        userId: { in: teachersToDelete.map(t => t.id) },
        role: { in: ['ADMIN', 'STAFF'] }
      }
    })
    console.log(`   ✓ Deleted ${teachersToDelete.length} teacher memberships`)

    // Delete the users
    await prisma.user.deleteMany({
      where: {
        id: { in: teachersToDelete.map(t => t.id) }
      }
    })
    console.log(`   ✓ Deleted ${teachersToDelete.length} demo teacher accounts`)
  }

  console.log(`\n✅ Demo data removal completed successfully!\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

