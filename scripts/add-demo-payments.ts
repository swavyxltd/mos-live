import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding demo payment records...')

  // Get all organizations
  const orgs = await prisma.org.findMany({
    include: {
      students: {
        where: { isArchived: false },
        take: 5,
        include: {
          studentClasses: {
            include: {
              class: true
            },
            take: 1
          }
        }
      }
    }
  })

  if (orgs.length === 0) {
    console.error('No organizations found. Please create an organization first.')
    process.exit(1)
  }

  // Find org with students
  let org = orgs.find(o => o.students.length > 0)
  
  if (!org) {
    console.log('No students found in any organization. Creating demo data...')
    
    // Get first org
    org = orgs[0]
    
    // Check if we have classes, create one if not
    let classes = await prisma.class.findMany({
      where: { orgId: org.id, isArchived: false },
      take: 1
    })
    
    if (classes.length === 0) {
      console.log('Creating demo class...')
      const demoClass = await prisma.class.create({
        data: {
          orgId: org.id,
          name: 'Level 1 - Beginners',
          description: 'Basic Arabic and Quran studies',
          schedule: JSON.stringify({
            days: ['Monday', 'Wednesday', 'Friday'],
            startTime: '4:00 PM',
            endTime: '5:30 PM'
          }),
          monthlyFeeP: 2500 // £25.00
        }
      })
      classes = [demoClass]
      console.log(`✅ Created class: ${demoClass.name}`)
    }
    
    // Create demo students
    const demoStudents = []
    const studentNames = [
      { first: 'Ahmed', last: 'Khan' },
      { first: 'Fatima', last: 'Ali' },
      { first: 'Yusuf', last: 'Hassan' },
      { first: 'Aisha', last: 'Patel' }
    ]
    
    for (let i = 0; i < 4; i++) {
      const name = studentNames[i]
      const student = await prisma.student.create({
        data: {
          orgId: org.id,
          firstName: name.first,
          lastName: name.last,
          dob: new Date(2015, i, 15)
        }
      })
      
      // Enroll in first class
      await prisma.studentClass.create({
        data: {
          orgId: org.id,
          studentId: student.id,
          classId: classes[0].id
        }
      })
      
      demoStudents.push({
        ...student,
        studentClasses: [{
          class: classes[0]
        }]
      })
    }
    
    org.students = demoStudents
    console.log(`✅ Created ${demoStudents.length} demo students`)
  }

  console.log(`Found organization: ${org.name}`)
  console.log(`Found ${org.students.length} students`)

  // Get current month and previous months
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2)
  const twoMonthsAgoStr = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const months = [currentMonth, lastMonthStr, twoMonthsAgoStr]
  const methods = ['CASH', 'BANK_TRANSFER', 'STRIPE']
  const statuses = ['PAID', 'PENDING', 'LATE']

  const demoRecords = []

  // Create demo payment records - create 1 record per student for variety
  const studentsToProcess = org.students.slice(0, 4)
  
  for (let i = 0; i < studentsToProcess.length; i++) {
    const student = studentsToProcess[i]
    const studentClass = student.studentClasses[0]?.class

    if (!studentClass) {
      console.warn(`Student ${student.firstName} ${student.lastName} has no classes, skipping...`)
      continue
    }

    // Get class monthly fee (default to £25 if not set)
    const monthlyFee = studentClass.monthlyFeeP || 2500 // 2500 pence = £25

    // Create one payment record per student with different statuses
    const month = months[i % months.length]
    const method = methods[i % methods.length]
    const status = i === 0 ? 'PAID' : i === 1 ? 'PENDING' : i === 2 ? 'LATE' : 'PAID'

    // Check if record already exists
    const existing = await prisma.monthlyPaymentRecord.findUnique({
      where: {
        studentId_classId_month: {
          studentId: student.id,
          classId: studentClass.id,
          month
        }
      }
    })

    if (existing) {
      console.log(`Payment record already exists for ${student.firstName} ${student.lastName} - ${month}, skipping...`)
      continue
    }

    const paidAt = status === 'PAID' ? new Date() : null
    const reference = method === 'BANK_TRANSFER' ? `REF-${Date.now()}-${i}` : method === 'STRIPE' ? `ch_${Date.now()}_${i}` : null

    const record = await prisma.monthlyPaymentRecord.create({
      data: {
        orgId: org.id,
        studentId: student.id,
        classId: studentClass.id,
        month,
        amountP: monthlyFee,
        method,
        status,
        paidAt,
        reference,
        notes: status === 'PAID' ? 'Payment received' : status === 'PENDING' ? 'Awaiting payment' : 'Payment overdue'
      }
    })

    demoRecords.push(record)
    console.log(`✅ Created payment record for ${student.firstName} ${student.lastName} - ${month} - £${(monthlyFee / 100).toFixed(2)} - ${method} - ${status}`)
  }

  console.log(`\n✨ Created ${demoRecords.length} demo payment records!`)
  console.log(`\nPayment records:`)
  demoRecords.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.month} - £${(r.amountP / 100).toFixed(2)} - ${r.method} - ${r.status}`)
  })
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

