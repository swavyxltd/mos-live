import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n🎭 Adding demo data for test accounts...\n')
  console.log('─'.repeat(80))

  // Find test users
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

  const staffUser = await prisma.user.findUnique({
    where: { email: 'staff@test.com' },
    include: {
      UserOrgMembership: {
        include: {
          Org: true
        }
      }
    }
  })

  const parentUser = await prisma.user.findUnique({
    where: { email: 'parent@test.com' },
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

  if (!staffUser) {
    console.error('❌ staff@test.com not found')
    process.exit(1)
  }

  if (!parentUser) {
    console.error('❌ parent@test.com not found')
    process.exit(1)
  }

  // Get the organization for admin (assuming they're in the same org)
  const adminMembership = adminUser.UserOrgMembership[0]
  if (!adminMembership) {
    console.error('❌ Admin user has no organization membership')
    process.exit(1)
  }

  const org = adminMembership.Org
  console.log(`✅ Found organization: ${org.name} (${org.id})`)
  console.log(`   This is a DEMO organization - data will be isolated here\n`)

  // Verify this is NOT the owner's organization by checking if any owner accounts are in it
  const ownerMemberships = await prisma.userOrgMembership.findMany({
    where: {
      orgId: org.id,
      User: {
        isSuperAdmin: true
      }
    }
  })

  if (ownerMemberships.length > 0) {
    console.error('❌ ERROR: This organization has owner accounts! Aborting to prevent affecting live data.')
    process.exit(1)
  }

  console.log('✅ Verified: No owner accounts in this organization\n')

  // Step 1: Create 5 classes
  console.log('📚 Creating 5 classes...')
  const classNames = [
    'Quran Recitation - Level 1',
    'Islamic Studies - Level 2',
    'Arabic Grammar - Beginners',
    'Tajweed - Intermediate',
    'Fiqh - Level 1'
  ]

  const classes = []
  for (let i = 0; i < 5; i++) {
    const classData = await prisma.class.upsert({
      where: {
        id: `demo-class-${i + 1}-${org.id}`
      },
      update: {},
      create: {
        id: `demo-class-${i + 1}-${org.id}`,
        orgId: org.id,
        name: classNames[i],
        description: `Demo class for ${classNames[i]}`,
        schedule: JSON.stringify({
          days: ['Monday', 'Wednesday', 'Friday'],
          startTime: `${4 + i}:00 PM`,
          endTime: `${5 + i}:30 PM`
        }),
        monthlyFeeP: 2500 + (i * 500), // £25, £30, £35, £40, £45
        feeDueDay: 1, // 1st of each month
        teacherId: i === 0 ? staffUser.id : null, // Assign first class to staff user
        updatedAt: new Date()
      }
    })
    classes.push(classData)
    console.log(`   ✅ Created: ${classData.name}`)
  }

  // Update staff user to be a teacher for the first class
  const staffMembership = staffUser.UserOrgMembership.find(m => m.orgId === org.id)
  if (staffMembership) {
    await prisma.userOrgMembership.update({
      where: {
        userId_orgId: {
          userId: staffUser.id,
          orgId: org.id
        }
      },
      data: {
        role: 'STAFF'
      }
    })
    console.log(`\n✅ Updated staff@test.com to STAFF role`)
  }

  // Step 2: Create 100 students (20 per class)
  console.log('\n👥 Creating 100 students (20 per class)...')
  const firstNames = [
    'Ahmed', 'Fatima', 'Yusuf', 'Aisha', 'Omar', 'Zainab', 'Hassan', 'Maryam',
    'Ibrahim', 'Khadija', 'Ali', 'Aminah', 'Muhammad', 'Safiya', 'Hamza', 'Hafsa',
    'Bilal', 'Ruqayyah', 'Umar', 'Umm Kulthum', 'Khalid', 'Fatimah', 'Salman', 'Zaynab',
    'Abdullah', 'Ayesha', 'Usman', 'Sumayyah', 'Zaid', 'Nusaybah'
  ]
  const lastNames = [
    'Khan', 'Ali', 'Hassan', 'Patel', 'Ahmed', 'Malik', 'Sheikh', 'Hussain',
    'Rahman', 'Iqbal', 'Syed', 'Mahmood', 'Butt', 'Chaudhry', 'Akhtar'
  ]

  const students = []
  let studentIndex = 0

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classItem = classes[classIndex]
    
    for (let i = 0; i < 20; i++) {
      const firstName = firstNames[studentIndex % firstNames.length]
      const lastName = lastNames[studentIndex % lastNames.length]
      const studentNumber = studentIndex + 1

      const studentId = `demo-student-${studentNumber}-${org.id}`
      const student = await prisma.student.upsert({
        where: { id: studentId },
        update: {},
        create: {
          id: studentId,
          orgId: org.id,
          firstName: `${firstName} ${studentNumber}`,
          lastName: lastName,
          dob: new Date(2010 + (studentIndex % 10), studentIndex % 12, (studentIndex % 28) + 1),
          isArchived: false,
          updatedAt: new Date(),
          StudentClass: {
            create: {
              id: `demo-student-class-${studentNumber}-${org.id}`,
              orgId: org.id,
              classId: classItem.id
            }
          }
        }
      })
      
      // Ensure student is enrolled in the class (in case student existed but wasn't enrolled)
      await prisma.studentClass.upsert({
        where: {
          studentId_classId: {
            studentId: student.id,
            classId: classItem.id
          }
        },
        update: {},
        create: {
          id: `demo-student-class-${studentNumber}-${org.id}`,
          orgId: org.id,
          studentId: student.id,
          classId: classItem.id
        }
      })
      students.push(student)
      studentIndex++
    }
    console.log(`   ✅ Created 20 students for ${classItem.name}`)
  }

  console.log(`\n✅ Created ${students.length} students total`)

  // Step 3: Create parent billing profiles and link 2 children to parent@test.com
  console.log('\n👨‍👩‍👧 Linking parent@test.com to 2 children...')
  const parentChildren = students.slice(0, 2)
  
  // Create parent billing profile (one per parent per org)
  await prisma.parentBillingProfile.upsert({
    where: {
      orgId_parentUserId: {
        orgId: org.id,
        parentUserId: parentUser.id
      }
    },
    update: {
      preferredPaymentMethod: 'CASH',
      autoPayEnabled: false
    },
    create: {
      id: `demo-parent-billing-${parentUser.id}-${org.id}`,
      orgId: org.id,
      parentUserId: parentUser.id,
      preferredPaymentMethod: 'CASH',
      autoPayEnabled: false,
      updatedAt: new Date()
    }
  })
  
  for (const child of parentChildren) {
    // Update student to link to parent
    await prisma.student.update({
      where: { id: child.id },
      data: {
        primaryParentId: parentUser.id
      }
    })
  }
  console.log(`   ✅ Linked parent@test.com to: ${parentChildren[0].firstName} ${parentChildren[0].lastName} and ${parentChildren[1].firstName} ${parentChildren[1].lastName}`)

  // Ensure parent has membership in the org
  const parentMembership = parentUser.UserOrgMembership.find(m => m.orgId === org.id)
  if (!parentMembership) {
    await prisma.userOrgMembership.create({
      data: {
        userId: parentUser.id,
        orgId: org.id,
        role: 'PARENT'
      }
    })
    console.log(`   ✅ Created parent membership in organization`)
  }

  // Step 4: Create 3 months of attendance data
  console.log('\n📊 Creating 3 months of attendance data...')
  const now = new Date()
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(now.getMonth() - 3)

  let attendanceCount = 0
  const statuses = ['PRESENT', 'ABSENT', 'LATE', 'PRESENT', 'PRESENT'] // 60% present rate

  // Generate attendance for each class, for each student, for each day in the last 3 months
  for (const classItem of classes) {
    // Get students enrolled in this class
    const studentClasses = await prisma.studentClass.findMany({
      where: { classId: classItem.id },
      include: { Student: true }
    })
    const classStudents = studentClasses.map(sc => sc.Student)

    // Get class schedule days (Monday, Wednesday, Friday)
    const schedule = JSON.parse(classItem.schedule)
    const classDays = schedule.days || ['Monday', 'Wednesday', 'Friday']

    // Generate attendance for the last 3 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const monthDate = new Date(threeMonthsAgo)
      monthDate.setMonth(threeMonthsAgo.getMonth() + monthOffset)

      // For each day in the month
      for (let day = 1; day <= 28; day++) { // Use 28 days to avoid month-end issues
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

        // Only create attendance for scheduled class days
        if (classDays.includes(dayName)) {
          for (const student of classStudents) {
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            
            await prisma.attendance.upsert({
              where: {
                classId_studentId_date: {
                  classId: classItem.id,
                  studentId: student.id,
                  date: date
                }
              },
              update: {},
              create: {
                id: `demo-attendance-${classItem.id}-${student.id}-${date.toISOString()}`,
                orgId: org.id,
                classId: classItem.id,
                studentId: student.id,
                date: date,
                status: status
              }
            })
            attendanceCount++
          }
        }
      }
    }
  }

  console.log(`   ✅ Created ${attendanceCount} attendance records`)

  // Step 5: Create payment records for the last 3 months
  console.log('\n💳 Creating payment records for the last 3 months...')
  let paymentCount = 0
  const paymentMethods = ['CASH', 'BANK_TRANSFER']
  const paymentStatuses = ['PAID', 'PENDING', 'LATE', 'OVERDUE']

  for (const student of students) {
    const studentClasses = await prisma.studentClass.findMany({
      where: { studentId: student.id },
      include: { Class: true }
    })

    for (const studentClass of studentClasses) {
      const classItem = studentClass.Class
      if (!classItem.monthlyFeeP) continue

      // Create payment records for last 3 months
      for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
        const monthDate = new Date(now)
        monthDate.setMonth(now.getMonth() - monthOffset)
        monthDate.setDate(1) // First of the month

        // Determine status based on month
        let status = 'PAID'
        if (monthOffset === 0) {
          // Current month - mix of statuses
          status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
        } else if (monthOffset === 1) {
          // Last month - mostly paid, some late
          status = Math.random() > 0.2 ? 'PAID' : 'LATE'
        } else {
          // 2 months ago - all paid
          status = 'PAID'
        }

        const paymentMethod = status === 'PAID' 
          ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
          : null

        await prisma.monthlyPaymentRecord.create({
          data: {
            id: `demo-payment-${student.id}-${classItem.id}-${monthDate.toISOString()}`,
            orgId: org.id,
            studentId: student.id,
            classId: classItem.id,
            month: monthDate.toISOString().substring(0, 7), // Format: YYYY-MM
            amountP: classItem.monthlyFeeP,
            status: status,
            method: paymentMethod,
            paidAt: status === 'PAID' ? new Date(monthDate.getTime() + (Math.random() * 5 * 24 * 60 * 60 * 1000)) : null, // Paid within 5 days of due date
            reference: status === 'PAID' ? `DEMO-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
            createdAt: monthDate,
            updatedAt: new Date()
          }
        })
        paymentCount++
      }
    }
  }

  console.log(`   ✅ Created ${paymentCount} payment records`)

  // Summary
  console.log('\n' + '─'.repeat(80))
  console.log('✅ DEMO DATA CREATION COMPLETE\n')
  console.log(`📊 Summary:`)
  console.log(`   Organization: ${org.name}`)
  console.log(`   Classes: ${classes.length}`)
  console.log(`   Students: ${students.length}`)
  console.log(`   Attendance Records: ${attendanceCount}`)
  console.log(`   Payment Records: ${paymentCount}`)
  console.log(`   Staff Account: staff@test.com (assigned to "${classes[0].name}")`)
  console.log(`   Parent Account: parent@test.com (linked to 2 children)`)
  console.log('\n⚠️  IMPORTANT: This data is isolated to the test organization only.')
  console.log('   It will NOT appear in owner accounts or other organizations.\n')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

