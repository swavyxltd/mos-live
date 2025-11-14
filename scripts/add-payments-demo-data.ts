import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n🎨 Adding demo data for payments page...\n')

  // Get active organization
  const org = await prisma.org.findFirst({
    where: { status: 'ACTIVE' }
  })

  if (!org) {
    console.error('❌ No active organization found')
    process.exit(1)
  }

  console.log(`✅ Found organization: ${org.name}`)

  // Get or create teachers
  let teachers = await prisma.user.findMany({
    where: {
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] }
        }
      }
    },
    take: 2
  })

  if (teachers.length < 2) {
    // Create demo teachers if needed
    const teacher1 = await prisma.user.create({
      data: {
        email: `teacher1-${Date.now()}@demo.com`,
        name: 'Moulana Omar',
        phone: '+44 7700 900123'
      }
    })
    await prisma.userOrgMembership.create({
      data: {
        userId: teacher1.id,
        orgId: org.id,
        role: 'STAFF'
      }
    })
    teachers.push(teacher1)

    const teacher2 = await prisma.user.create({
      data: {
        email: `teacher2-${Date.now()}@demo.com`,
        name: 'Apa Aisha',
        phone: '+44 7700 900456'
      }
    })
    await prisma.userOrgMembership.create({
      data: {
        userId: teacher2.id,
        orgId: org.id,
        role: 'STAFF'
      }
    })
    teachers.push(teacher2)
  }

  // Create or get classes
  let classes = await prisma.class.findMany({
    where: { orgId: org.id, isArchived: false },
    take: 3
  })

  if (classes.length < 3) {
    const classNames = [
      { name: 'Quran Recitation - Level 1', fee: 2500, teacher: teachers[0] },
      { name: 'Islamic Studies - Level 2', fee: 3000, teacher: teachers[1] || teachers[0] },
      { name: 'Arabic Language - Beginners', fee: 2000, teacher: teachers[0] }
    ]

    for (const classData of classNames) {
      const existingClass = classes.find(c => c.name === classData.name)
      if (!existingClass) {
        const newClass = await prisma.class.create({
          data: {
            orgId: org.id,
            name: classData.name,
            description: `Demo class for ${classData.name}`,
            schedule: JSON.stringify({
              days: ['Monday', 'Wednesday', 'Friday'],
              startTime: '4:00 PM',
              endTime: '5:30 PM'
            }),
            teacherId: classData.teacher.id,
            monthlyFeeP: classData.fee
          }
        })
        classes.push(newClass)
        console.log(`✅ Created class: ${newClass.name}`)
      }
    }
  }

  // Create parents
  const parentData = [
    { name: 'Ahmed Khan', email: 'ahmed.khan@example.com', phone: '+44 7700 111111' },
    { name: 'Fatima Ali', email: 'fatima.ali@example.com', phone: '+44 7700 222222' },
    { name: 'Yusuf Hassan', email: 'yusuf.hassan@example.com', phone: '+44 7700 333333' },
    { name: 'Aisha Patel', email: 'aisha.patel@example.com', phone: '+44 7700 444444' },
    { name: 'Omar Ahmed', email: 'omar.ahmed@example.com', phone: '+44 7700 555555' },
    { name: 'Mariam Khan', email: 'mariam.khan@example.com', phone: '+44 7700 666666' },
    { name: 'Hassan Ali', email: 'hassan.ali@example.com', phone: '+44 7700 777777' },
    { name: 'Zainab Hassan', email: 'zainab.hassan@example.com', phone: '+44 7700 888888' },
    { name: 'Ibrahim Patel', email: 'ibrahim.patel@example.com', phone: '+44 7700 999999' },
    { name: 'Layla Ahmed', email: 'layla.ahmed@example.com', phone: '+44 7700 101010' },
    { name: 'Muhammad Khan', email: 'muhammad.khan@example.com', phone: '+44 7700 202020' },
    { name: 'Sara Ali', email: 'sara.ali@example.com', phone: '+44 7700 303030' },
    { name: 'Ali Hassan', email: 'ali.hassan@example.com', phone: '+44 7700 404040' },
    { name: 'Amina Patel', email: 'amina.patel@example.com', phone: '+44 7700 505050' },
    { name: 'Khalid Ahmed', email: 'khalid.ahmed@example.com', phone: '+44 7700 606060' }
  ]

  const parents = []
  for (const parentInfo of parentData) {
    let parent = await prisma.user.findUnique({
      where: { email: parentInfo.email }
    })

    if (!parent) {
      parent = await prisma.user.create({
        data: {
          email: parentInfo.email,
          name: parentInfo.name,
          phone: parentInfo.phone
        }
      })
      await prisma.userOrgMembership.create({
        data: {
          userId: parent.id,
          orgId: org.id,
          role: 'PARENT'
        }
      })
    }
    parents.push(parent)
  }

  console.log(`✅ Created/found ${parents.length} parents`)

  // Create students and enroll them in classes
  const studentNames = [
    { first: 'Ahmed', last: 'Khan' },
    { first: 'Fatima', last: 'Ali' },
    { first: 'Yusuf', last: 'Hassan' },
    { first: 'Aisha', last: 'Patel' },
    { first: 'Omar', last: 'Ahmed' },
    { first: 'Mariam', last: 'Khan' },
    { first: 'Hassan', last: 'Ali' },
    { first: 'Zainab', last: 'Hassan' },
    { first: 'Ibrahim', last: 'Patel' },
    { first: 'Layla', last: 'Ahmed' },
    { first: 'Muhammad', last: 'Khan' },
    { first: 'Sara', last: 'Ali' },
    { first: 'Ali', last: 'Hassan' },
    { first: 'Amina', last: 'Patel' },
    { first: 'Khalid', last: 'Ahmed' }
  ]

  const students = []
  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i]
    const parent = parents[i]
    const classIndex = i % classes.length
    const class_ = classes[classIndex]

    // Check if student already exists
    let student = await prisma.student.findFirst({
      where: {
        orgId: org.id,
        firstName: name.first,
        lastName: name.last
      }
    })

    if (!student) {
      student = await prisma.student.create({
        data: {
          orgId: org.id,
          firstName: name.first,
          lastName: name.last,
          dob: new Date(2015 + (i % 5), i % 12, 15),
          primaryParentId: parent.id
        }
      })
    } else {
      // Update parent if not set
      if (!student.primaryParentId) {
        await prisma.student.update({
          where: { id: student.id },
          data: { primaryParentId: parent.id }
        })
      }
    }

    // Enroll in class if not already enrolled
    const enrollment = await prisma.studentClass.findFirst({
      where: {
        studentId: student.id,
        classId: class_.id
      }
    })

    if (!enrollment) {
      await prisma.studentClass.create({
        data: {
          orgId: org.id,
          studentId: student.id,
          classId: class_.id
        }
      })
    }

    students.push({ ...student, classId: class_.id })
  }

  console.log(`✅ Created/enrolled ${students.length} students`)

  // Clear existing payment records for this org
  const deletedCount = await prisma.monthlyPaymentRecord.deleteMany({
    where: { orgId: org.id }
  })
  console.log(`🗑️  Deleted ${deletedCount.count} existing payment records`)

  // Create payment records with different statuses
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2)
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const months = [currentMonth, lastMonthStr, twoMonthsAgoStr]
  const methods = ['CASH', 'BANK_TRANSFER', 'CASH', 'BANK_TRANSFER']
  // Mix of statuses including OVERDUE
  const statuses = ['PAID', 'PAID', 'LATE', 'OVERDUE', 'OVERDUE', 'PENDING', 'PENDING']

  let recordsCreated = 0

  for (let studentIndex = 0; studentIndex < students.length; studentIndex++) {
    const student = students[studentIndex]
    const class_ = classes.find(c => c.id === student.classId) || classes[0]
    const monthlyFee = class_.monthlyFeeP || 2500

    for (let i = 0; i < months.length; i++) {
      const month = months[i]
      // Distribute statuses: some students get OVERDUE, some get LATE, some get PAID
      let status: string
      let method: string | null = null
      let paidAt: Date | null = null
      let reference: string | null = null

      if (i === 0) {
        // Current month: mix of PAID, LATE, and OVERDUE
        if (studentIndex % 4 === 0) {
          status = 'PAID'
          method = methods[studentIndex % methods.length]
          paidAt = new Date()
          reference = `REF-${Date.now()}-${studentIndex}-${i}`
        } else if (studentIndex % 4 === 1) {
          status = 'LATE'
          method = 'BANK_TRANSFER'
        } else if (studentIndex % 4 === 2) {
          status = 'OVERDUE'
          method = 'BANK_TRANSFER'
        } else {
          status = 'PENDING'
        }
      } else if (i === 1) {
        // Last month: mostly PAID, some OVERDUE
        if (studentIndex % 3 === 0) {
          status = 'PAID'
          method = methods[studentIndex % methods.length]
          paidAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
          reference = `REF-${Date.now()}-${studentIndex}-${i}`
        } else if (studentIndex % 3 === 1) {
          status = 'OVERDUE'
          method = 'BANK_TRANSFER'
        } else {
          status = 'PAID'
          method = 'BANK_TRANSFER'
          paidAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
          reference = `REF-${Date.now()}-${studentIndex}-${i}`
        }
      } else {
        // Two months ago: mostly PAID, some OVERDUE
        if (studentIndex % 5 === 0) {
          status = 'OVERDUE'
          method = 'BANK_TRANSFER'
        } else {
          status = 'PAID'
          method = methods[studentIndex % methods.length]
          paidAt = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) // 50 days ago
          reference = `REF-${Date.now()}-${studentIndex}-${i}`
        }
      }

      // Check if record already exists
      const existing = await prisma.monthlyPaymentRecord.findFirst({
        where: {
          orgId: org.id,
          studentId: student.id,
          classId: class_.id,
          month: month
        }
      })

      if (!existing) {
        const now = new Date()
        await prisma.monthlyPaymentRecord.create({
          data: {
            id: `record-${student.id}-${class_.id}-${month}-${Date.now()}-${i}`,
            orgId: org.id,
            studentId: student.id,
            classId: class_.id,
            month: month,
            amountP: monthlyFee,
            method: method,
            status: status,
            paidAt: paidAt,
            reference: reference,
            updatedAt: now
          }
        })
        recordsCreated++
      }
    }
  }

  console.log(`✅ Created ${recordsCreated} payment records`)
  console.log(`\n📊 Summary:`)
  console.log(`   - Classes: ${classes.length}`)
  console.log(`   - Students: ${students.length}`)
  console.log(`   - Payment Records: ${recordsCreated}`)
  console.log(`\n✨ Demo data added successfully!\n`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

