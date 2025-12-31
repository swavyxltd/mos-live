import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking attendance data...\n')

  // Find the organisation
  let org = await prisma.org.findFirst({
    where: {
      OR: [
        { slug: 'leicester-islamic-centre' },
        { name: { contains: 'test', mode: 'insensitive' } }
      ]
    }
  })

  if (!org) {
    org = await prisma.org.findFirst()
  }

  if (!org) {
    console.error('❌ Organisation not found')
    process.exit(1)
  }

  console.log(`📋 Organisation: ${org.name}\n`)

  // Find Boys class
  const boysClass = await prisma.class.findFirst({
    where: {
      orgId: org.id,
      name: { contains: 'Boys', mode: 'insensitive' },
      isArchived: false
    }
  })

  if (!boysClass) {
    console.error('❌ Boys class not found')
    process.exit(1)
  }

  console.log(`📚 Class: ${boysClass.name} (ID: ${boysClass.id})\n`)

  // Check attendance records for 2025
  const yearStart = new Date(2025, 0, 1)
  yearStart.setHours(0, 0, 0, 0)
  const yearEnd = new Date(2025, 11, 31, 23, 59, 59, 999)

  const attendanceCount = await prisma.attendance.count({
    where: {
      orgId: org.id,
      classId: boysClass.id,
      date: {
        gte: yearStart,
        lte: yearEnd
      }
    }
  })

  console.log(`📊 Attendance records for 2025: ${attendanceCount}`)

  // Get sample records
  const sampleRecords = await prisma.attendance.findMany({
    where: {
      orgId: org.id,
      classId: boysClass.id,
      date: {
        gte: yearStart,
        lte: yearEnd
      }
    },
    take: 5,
    orderBy: {
      date: 'asc'
    },
    include: {
      Student: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  console.log(`\n📝 Sample records (first 5):`)
  sampleRecords.forEach(record => {
    console.log(`   - ${record.Student.firstName} ${record.Student.lastName}: ${record.date.toISOString().split('T')[0]} - ${record.status}`)
  })

  // Check by month
  console.log(`\n📅 Records by month:`)
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(2025, month, 1)
    const monthEnd = new Date(2025, month + 1, 0, 23, 59, 59, 999)
    
    const count = await prisma.attendance.count({
      where: {
        orgId: org.id,
        classId: boysClass.id,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })
    
    const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' })
    console.log(`   ${monthName} 2025: ${count} records`)
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

