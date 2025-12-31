import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('🎭 Adding demo attendance data for Boys class...\n')

  // Find the organisation - prioritize the one used by the server
  // First try to find "Test Islamic School" with the specific org ID
  let org = await prisma.org.findUnique({
    where: { id: 'cmhhagwzf0001ye1i4oo2yb6i' } // Explicitly target the org used by the server
  })

  // If not found by ID, try by name
  if (!org) {
    org = await prisma.org.findFirst({
      where: {
        OR: [
          { name: { contains: 'test islamic school', mode: 'insensitive' } },
          { slug: 'test-islamic-school' },
          { name: { contains: 'test', mode: 'insensitive' } },
          { slug: 'leicester-islamic-centre' },
          { name: { contains: 'Leicester', mode: 'insensitive' } }
        ]
      }
    })
  }

  // If still not found, get the first org
  if (!org) {
    org = await prisma.org.findFirst()
  }

  if (!org) {
    console.error('❌ Organisation not found')
    process.exit(1)
  }

  console.log(`📋 Found organisation: ${org.name} (ID: ${org.id})\n`)

  // Find the Boys class
  const boysClass = await prisma.class.findFirst({
    where: {
      orgId: org.id,
      name: { contains: 'Boys', mode: 'insensitive' }
    },
    include: {
      StudentClass: {
        include: {
          Student: true
        }
      }
    }
  })

  if (!boysClass) {
    console.error('❌ Boys class not found')
    process.exit(1)
  }

  console.log(`📚 Found class: ${boysClass.name}`)
  console.log(`   Students enrolled: ${boysClass.StudentClass.length}\n`)

  // Get all students in the class
  let students = boysClass.StudentClass.map(sc => sc.Student).filter(s => !s.isArchived)

  // Ensure we have exactly 15 students
  const targetStudentCount = 15
  if (students.length < targetStudentCount) {
    console.log(`📝 Creating ${targetStudentCount - students.length} additional students...`)
    
    const firstNames = ['Ahmed', 'Mohammed', 'Ali', 'Hassan', 'Omar', 'Ibrahim', 'Yusuf', 'Hamza', 'Zain', 'Bilal', 'Adam', 'Idris', 'Musa', 'Ismail', 'Khalid']
    const lastNames = ['Patel', 'Ahmed', 'Khan', 'Ali', 'Hassan', 'Ibrahim', 'Malik', 'Hussain', 'Sheikh', 'Rahman', 'Chowdhury', 'Mahmood', 'Butt', 'Shah', 'Akhtar']
    
    const studentsToCreate = targetStudentCount - students.length
    for (let i = 0; i < studentsToCreate; i++) {
      const firstName = firstNames[students.length % firstNames.length]
      const lastName = lastNames[students.length % lastNames.length]
      const dob = new Date(2010 + (students.length % 5), (students.length * 2) % 12, (students.length * 3) % 28 + 1)
      
      const newStudent = await prisma.student.create({
        data: {
          id: crypto.randomUUID(),
          orgId: org.id,
          firstName: `${firstName}${students.length > 0 ? students.length : ''}`,
          lastName: lastName,
          dob: dob,
          claimStatus: 'NOT_CLAIMED',
          updatedAt: new Date()
        }
      })
      
      // Enroll student in class
      await prisma.studentClass.create({
        data: {
          id: crypto.randomUUID(),
          orgId: org.id,
          studentId: newStudent.id,
          classId: boysClass.id
        }
      })
      
      students.push(newStudent)
      console.log(`   ✅ Created student: ${newStudent.firstName} ${newStudent.lastName}`)
    }
    console.log('')
  } else if (students.length > targetStudentCount) {
    // If we have more than 15, use only the first 15
    students = students.slice(0, targetStudentCount)
    console.log(`⚠️  Found ${boysClass.StudentClass.length} students, using first ${targetStudentCount}\n`)
  }

  if (students.length === 0) {
    console.error('❌ No students found in Boys class')
    process.exit(1)
  }

  console.log(`👥 Using ${students.length} students for attendance data\n`)

  // Generate attendance from October to December 2025
  const yearStart = new Date(2025, 9, 1) // October 1, 2025 (month is 0-indexed, so 9 = October)
  yearStart.setHours(0, 0, 0, 0)
  
  const yearEnd = new Date(2025, 11, 31) // December 31, 2025 (month is 0-indexed, so 11 = December)
  yearEnd.setHours(23, 59, 59, 999)
  
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  
  // Don't create future dates - use today as the end date if it's before yearEnd
  const endDate = yearEnd > now ? now : yearEnd

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  
  // Assign attendance patterns based on the specified distribution:
  // 95% of students: 95%+ attendance
  // 3% of students: less than 95% (but >= 90%)
  // 2% of students: less than 90%
  
  const studentCount = students.length
  const excellentCount = Math.floor(studentCount * 0.95) // 95% - 95%+ attendance
  const goodCount = Math.floor(studentCount * 0.03) // 3% - 90-95% attendance
  // Remaining 2% - less than 90% attendance
  
  // Attendance patterns
  const excellentPattern = { present: 0.96, late: 0.02, absent: 0.02 } // 98% total (96% present + 2% late)
  const goodPattern = { present: 0.92, late: 0.02, absent: 0.06 } // 94% total (92% present + 2% late)
  const poorPattern = { present: 0.85, late: 0.03, absent: 0.12 } // 88% total (85% present + 3% late)

  let createdCount = 0
  let updatedCount = 0

  console.log(`📊 Assigning attendance patterns:`)
  console.log(`   - ${excellentCount} students: 95%+ attendance (excellent)`)
  console.log(`   - ${goodCount} students: 90-95% attendance (good)`)
  console.log(`   - ${studentCount - excellentCount - goodCount} students: <90% attendance (needs improvement)\n`)

  // Generate attendance for each day in 2025
  const currentDate = new Date(yearStart)
  
  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Only create attendance for weekdays
    if (weekDays.includes(dayName)) {
      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        
        // Assign pattern based on student index
        let pattern: { present: number; late: number; absent: number }
        if (i < excellentCount) {
          pattern = excellentPattern // 95%+ attendance
        } else if (i < excellentCount + goodCount) {
          pattern = goodPattern // 90-95% attendance
        } else {
          pattern = poorPattern // <90% attendance
        }
        
        const rand = Math.random()
        
        let status: 'PRESENT' | 'ABSENT' | 'LATE'
        if (rand < pattern.present) {
          status = 'PRESENT'
        } else if (rand < pattern.present + pattern.late) {
          status = 'LATE'
        } else {
          status = 'ABSENT'
        }

        try {
          const existing = await prisma.attendance.findUnique({
            where: {
              classId_studentId_date: {
                classId: boysClass.id,
                studentId: student.id,
                date: new Date(currentDate)
              }
            }
          })

          if (existing) {
            // Update existing record
            await prisma.attendance.update({
              where: { id: existing.id },
              data: { status }
            })
            updatedCount++
          } else {
            // Create new record
            await prisma.attendance.create({
              data: {
                id: crypto.randomUUID(),
                orgId: org.id,
                classId: boysClass.id,
                studentId: student.id,
                date: new Date(currentDate),
                status
              }
            })
            createdCount++
          }
        } catch (error: any) {
          // Skip duplicates/errors
          if (!error.message?.includes('Unique constraint')) {
            console.error(`Error for ${student.firstName} on ${currentDate.toISOString()}:`, error.message)
          }
        }
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }

  console.log(`\n✅ Successfully added demo attendance data`)
  console.log(`   - Created: ${createdCount} records`)
  console.log(`   - Updated: ${updatedCount} records`)
  console.log(`   - Total: ${createdCount + updatedCount} records`)
  console.log(`   - Period: October to December 2025 (weekdays only)`)
  console.log(`   - Students: ${students.length}`)
  console.log(`   - Date range: ${yearStart.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

