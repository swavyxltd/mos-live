import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating attendance data to match Monday-Friday schedule...\n')

  // Find the organization for admin@test.com
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@test.com' },
    include: {
      UserOrgMembership: {
        include: {
          Org: true
        }
      }
    }
  })

  if (!adminUser) {
    console.error('❌ admin@test.com not found')
    process.exit(1)
  }

  const org = adminUser.UserOrgMembership[0]?.Org
  if (!org) {
    console.error('❌ No organization found for admin@test.com')
    process.exit(1)
  }

  console.log(`📋 Found organization: ${org.name} (${org.id})\n`)

  // Get all classes for this organization
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id
    }
  })

  if (classes.length === 0) {
    console.log('⚠️  No classes found')
    process.exit(0)
  }

  console.log(`📚 Found ${classes.length} classes\n`)

  // Get all attendance records
  const allAttendance = await prisma.attendance.findMany({
    where: {
      orgId: org.id
    }
  })

  console.log(`📊 Found ${allAttendance.length} existing attendance records\n`)

  // Delete attendance records for Saturday and Sunday
  let deletedCount = 0
  for (const attendance of allAttendance) {
    const date = new Date(attendance.date)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    
    if (dayName === 'Saturday' || dayName === 'Sunday') {
      await prisma.attendance.delete({
        where: { id: attendance.id }
      })
      deletedCount++
    }
  }

  console.log(`   ✅ Deleted ${deletedCount} attendance records for Saturday/Sunday\n`)

  // Now ensure we have attendance for Monday-Friday for the last month
  const now = new Date()
  const oneMonthAgo = new Date(now)
  oneMonthAgo.setMonth(now.getMonth() - 1)
  oneMonthAgo.setDate(1) // Start of month

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const statuses = ['PRESENT', 'ABSENT', 'LATE', 'PRESENT', 'PRESENT'] // 60% present rate
  let createdCount = 0

  for (const classItem of classes) {
    // Get students enrolled in this class
    const studentClasses = await prisma.studentClass.findMany({
      where: { classId: classItem.id },
      include: { Student: true }
    })
    const classStudents = studentClasses.map(sc => sc.Student)

    if (classStudents.length === 0) continue

    console.log(`   Processing class: ${classItem.name} (${classStudents.length} students)...`)

    // Generate attendance for the last month (Monday-Friday only)
    for (let day = 1; day <= 31; day++) {
      const date = new Date(oneMonthAgo.getFullYear(), oneMonthAgo.getMonth(), day)
      
      // Skip if date is invalid or in the future
      if (date.getMonth() !== oneMonthAgo.getMonth() || date > now) continue
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      
      // Only create attendance for Monday-Friday
      if (weekDays.includes(dayName)) {
        for (const student of classStudents) {
          try {
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            
            await prisma.attendance.upsert({
              where: {
                classId_studentId_date: {
                  classId: classItem.id,
                  studentId: student.id,
                  date: date
                }
              },
              update: {
                status: status // Update status if record exists
              },
              create: {
                id: `attendance-${classItem.id}-${student.id}-${date.getTime()}`,
                orgId: org.id,
                classId: classItem.id,
                studentId: student.id,
                date: date,
                status: status
              }
            })
            createdCount++
          } catch (error) {
            // Skip duplicates/errors
          }
        }
      }
    }
  }

  console.log(`\n✅ Successfully updated attendance data`)
  console.log(`   - Deleted ${deletedCount} Saturday/Sunday records`)
  console.log(`   - Created/Updated ${createdCount} Monday-Friday records`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

