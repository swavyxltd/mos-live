import { PrismaClient } from '@prisma/client'
import { resolve } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  console.log('\n🎭 Resetting demo data for admin@test.com...\n')
  console.log('─'.repeat(80))

  // Find admin user
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

  // Get the organization
  const adminMembership = adminUser.UserOrgMembership[0]
  if (!adminMembership) {
    console.error('❌ Admin user has no organization membership')
    process.exit(1)
  }

  const org = adminMembership.Org
  console.log(`✅ Found organization: ${org.name} (${org.id})\n`)

  // Step 1: Delete all existing demo data
  console.log('🗑️  Deleting existing demo data...')
  
  // Delete in order to respect foreign key constraints
  await prisma.attendance.deleteMany({ where: { orgId: org.id } })
  await prisma.studentClass.deleteMany({ where: { orgId: org.id } })
  await prisma.monthlyPaymentRecord.deleteMany({ where: { orgId: org.id } })
  await prisma.payment.deleteMany({ where: { orgId: org.id } })
  await prisma.invoice.deleteMany({ where: { orgId: org.id } })
  await prisma.progressLog.deleteMany({ where: { orgId: org.id } })
  await prisma.parentInvitation.deleteMany({ where: { orgId: org.id } })
  await prisma.application.deleteMany({ where: { orgId: org.id } })
  await prisma.student.deleteMany({ where: { orgId: org.id } })
  await prisma.class.deleteMany({ where: { orgId: org.id } })
  
  // Delete demo teachers (keep admin)
  const demoTeachers = await prisma.user.findMany({
    where: {
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: { in: ['STAFF', 'ADMIN'] }
        }
      },
      email: { not: 'admin@test.com' }
    }
  })
  
  for (const teacher of demoTeachers) {
    await prisma.userOrgMembership.deleteMany({
      where: { userId: teacher.id, orgId: org.id }
    })
    await prisma.user.delete({ where: { id: teacher.id } })
  }
  
  // Delete demo parents
  const demoParents = await prisma.user.findMany({
    where: {
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: 'PARENT'
        }
      }
    }
  })
  
  for (const parent of demoParents) {
    await prisma.parentBillingProfile.deleteMany({
      where: { parentUserId: parent.id, orgId: org.id }
    })
    await prisma.userOrgMembership.deleteMany({
      where: { userId: parent.id, orgId: org.id }
    })
    await prisma.user.delete({ where: { id: parent.id } })
  }
  
  await prisma.parentBillingProfile.deleteMany({ where: { orgId: org.id } })
  await prisma.auditLog.deleteMany({ where: { orgId: org.id } })
  
  console.log('   ✅ Deleted all existing demo data\n')

  // Step 2: Create 3 classes
  console.log('📚 Creating 3 classes...')
  const classes = []
  
  // Class 1: Male class - £50/month, 20 students
  const maleClass = await prisma.class.create({
    data: {
      id: `class-male-${org.id}`,
      orgId: org.id,
      name: 'Quran & Islamic Studies - Boys',
      description: 'Quran recitation and Islamic studies for boys',
      schedule: JSON.stringify({
        days: ['Monday', 'Wednesday', 'Friday'],
        startTime: '4:00 PM',
        endTime: '5:30 PM'
      }),
      monthlyFeeP: 5000, // £50
      feeDueDay: 1,
      updatedAt: new Date()
    }
  })
  classes.push(maleClass)
  console.log(`   ✅ Created: ${maleClass.name} (£50/month)`)

  // Class 2: Female class - £50/month, 20 students
  const femaleClass = await prisma.class.create({
    data: {
      id: `class-female-${org.id}`,
      orgId: org.id,
      name: 'Quran & Islamic Studies - Girls',
      description: 'Quran recitation and Islamic studies for girls',
      schedule: JSON.stringify({
        days: ['Monday', 'Wednesday', 'Friday'],
        startTime: '4:00 PM',
        endTime: '5:30 PM'
      }),
      monthlyFeeP: 5000, // £50
      feeDueDay: 1,
      updatedAt: new Date()
    }
  })
  classes.push(femaleClass)
  console.log(`   ✅ Created: ${femaleClass.name} (£50/month)`)

  // Class 3: Hifz class - £70/month, 10 students (males)
  const hifzClass = await prisma.class.create({
    data: {
      id: `class-hifz-${org.id}`,
      orgId: org.id,
      name: 'Hifz Class - Boys',
      description: 'Quran memorization class for boys',
      schedule: JSON.stringify({
        days: ['Tuesday', 'Thursday', 'Saturday'],
        startTime: '5:00 PM',
        endTime: '6:30 PM'
      }),
      monthlyFeeP: 7000, // £70
      feeDueDay: 1,
      updatedAt: new Date()
    }
  })
  classes.push(hifzClass)
  console.log(`   ✅ Created: ${hifzClass.name} (£70/month)`)

  // Step 3: Create 3 teachers
  console.log('\n👨‍🏫 Creating 3 teachers...')
  
  // Teacher 1: Male teacher for male class
  const maleTeacher = await prisma.user.create({
    data: {
      id: `teacher-male-${org.id}`,
      name: 'Umar Al-Rashid',
      email: 'umar.teacher@test.com',
      phone: '+44 7700 900200',
      emailVerified: new Date(),
      updatedAt: new Date()
    }
  })
  await prisma.userOrgMembership.create({
    data: {
      id: `membership-${maleTeacher.id}-${org.id}`,
      userId: maleTeacher.id,
      orgId: org.id,
      role: 'STAFF'
    }
  })
  await prisma.class.update({
    where: { id: maleClass.id },
    data: { teacherId: maleTeacher.id }
  })
  console.log(`   ✅ Created: ${maleTeacher.name} (assigned to ${maleClass.name})`)

  // Teacher 2: Female teacher for female class
  const femaleTeacher = await prisma.user.create({
    data: {
      id: `teacher-female-${org.id}`,
      name: 'Fatima Khan',
      email: 'fatima.teacher@test.com',
      phone: '+44 7700 900201',
      emailVerified: new Date(),
      updatedAt: new Date()
    }
  })
  await prisma.userOrgMembership.create({
    data: {
      id: `membership-${femaleTeacher.id}-${org.id}`,
      userId: femaleTeacher.id,
      orgId: org.id,
      role: 'STAFF'
    }
  })
  await prisma.class.update({
    where: { id: femaleClass.id },
    data: { teacherId: femaleTeacher.id }
  })
  console.log(`   ✅ Created: ${femaleTeacher.name} (assigned to ${femaleClass.name})`)

  // Teacher 3: Male teacher for hifz class
  const hifzTeacher = await prisma.user.create({
    data: {
      id: `teacher-hifz-${org.id}`,
      name: 'Ibrahim Ahmed',
      email: 'ibrahim.teacher@test.com',
      phone: '+44 7700 900202',
      emailVerified: new Date(),
      updatedAt: new Date()
    }
  })
  await prisma.userOrgMembership.create({
    data: {
      id: `membership-${hifzTeacher.id}-${org.id}`,
      userId: hifzTeacher.id,
      orgId: org.id,
      role: 'STAFF'
    }
  })
  await prisma.class.update({
    where: { id: hifzClass.id },
    data: { teacherId: hifzTeacher.id }
  })
  console.log(`   ✅ Created: ${hifzTeacher.name} (assigned to ${hifzClass.name})`)

  // Step 4: Create 50 students with real Muslim names
  console.log('\n👥 Creating 50 students with real Muslim names...')
  
  const maleFirstNames = [
    'Ahmed', 'Muhammad', 'Omar', 'Ali', 'Hassan', 'Hussein', 'Ibrahim', 'Yusuf', 'Khalid', 'Hamza',
    'Abdullah', 'Abdul Rahman', 'Abdul Aziz', 'Salman', 'Faisal', 'Saeed', 'Tariq', 'Zaid', 'Bilal', 'Usman',
    'Ayan', 'Armaan', 'Zayan', 'Rayyan', 'Ayaan', 'Ishaan', 'Rayan', 'Aryan', 'Zain', 'Ahaan',
    'Ahmad', 'Farid', 'Karim', 'Noor', 'Rahim', 'Sami', 'Wali', 'Yasin', 'Zahir', 'Amine'
  ]
  
  const femaleFirstNames = [
    'Fatima', 'Aisha', 'Maryam', 'Khadija', 'Zainab', 'Aminah', 'Hafsa', 'Safiya', 'Ruqayyah', 'Sumayyah',
    'Layla', 'Noor', 'Hana', 'Sara', 'Mariam', 'Yasmin', 'Nadia', 'Leila', 'Rania', 'Dina',
    'Aaliyah', 'Ayesha', 'Haniya', 'Inaya', 'Iman', 'Sana', 'Zara', 'Farah', 'Laila', 'Parisa',
    'Roya', 'Sahar', 'Samira', 'Soraya', 'Zahra', 'Aicha', 'Amina', 'Imane', 'Salma', 'Nour'
  ]
  
  const lastNames = [
    'Khan', 'Ali', 'Ahmed', 'Hassan', 'Hussain', 'Malik', 'Sheikh', 'Rahman', 'Iqbal', 'Syed',
    'Mahmood', 'Butt', 'Chaudhry', 'Akhtar', 'Qureshi', 'Raza', 'Shah', 'Abbas', 'Hashmi', 'Javed',
    'Patel', 'Al-Rashid', 'Al-Mansour', 'Al-Zahrani', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Mutairi', 'Al-Shammari',
    'Ahmadzai', 'Mohammadi', 'Rahimi', 'Safi', 'Yousufzai', 'Karimi', 'Alaoui', 'Benali', 'Bennani', 'Cherkaoui'
  ]

  const students = []
  const medicalNotes = [
    'Asthma - carries inhaler',
    'Allergic to peanuts - carry EpiPen',
    'Diabetes - monitor blood sugar',
    'Epilepsy - medication required',
    'ADHD - needs extra support',
    'Dyslexia - requires reading support',
    'Wears glasses',
    'Hearing aid required',
    'Food allergies: dairy and eggs',
    'Mild autism - sensory support needed',
    'Anxiety - may need breaks',
    'Asthma and seasonal allergies',
    'No known medical conditions',
    'Requires medication at lunchtime',
    'Allergic to bee stings',
    'Mild asthma',
    'Wears prescription glasses',
    'No medical notes',
    'Requires wheelchair access',
    'Speech therapy support',
    'Physical therapy ongoing',
    'No known allergies',
    'Mild hearing impairment',
    'Requires special dietary needs',
    'No medical concerns'
  ]

  // Create 20 male students for male class
  for (let i = 0; i < 20; i++) {
    const firstName = maleFirstNames[i % maleFirstNames.length]
    const lastName = lastNames[i % lastNames.length]
    const studentId = `student-male-${i + 1}-${org.id}`
    
    const student = await prisma.student.create({
      data: {
        id: studentId,
        orgId: org.id,
        firstName,
        lastName,
        dob: new Date(2010 + (i % 8), i % 12, (i % 28) + 1),
        medicalNotes: i < 10 ? medicalNotes[i % medicalNotes.length] : null, // Half have medical notes
        isArchived: false,
        updatedAt: new Date()
      }
    })
    
    await prisma.studentClass.create({
      data: {
        id: `student-class-${studentId}-${maleClass.id}`,
        orgId: org.id,
        studentId: student.id,
        classId: maleClass.id
      }
    })
    
    students.push(student)
  }
  console.log(`   ✅ Created 20 male students for ${maleClass.name}`)

  // Create 20 female students for female class
  for (let i = 0; i < 20; i++) {
    const firstName = femaleFirstNames[i % femaleFirstNames.length]
    const lastName = lastNames[(i + 20) % lastNames.length]
    const studentId = `student-female-${i + 1}-${org.id}`
    
    const student = await prisma.student.create({
      data: {
        id: studentId,
        orgId: org.id,
        firstName,
        lastName,
        dob: new Date(2010 + (i % 8), i % 12, (i % 28) + 1),
        medicalNotes: i < 10 ? medicalNotes[(i + 10) % medicalNotes.length] : null, // Half have medical notes
        isArchived: false,
        updatedAt: new Date()
      }
    })
    
    await prisma.studentClass.create({
      data: {
        id: `student-class-${studentId}-${femaleClass.id}`,
        orgId: org.id,
        studentId: student.id,
        classId: femaleClass.id
      }
    })
    
    students.push(student)
  }
  console.log(`   ✅ Created 20 female students for ${femaleClass.name}`)

  // Create 10 male students for hifz class
  for (let i = 0; i < 10; i++) {
    const firstName = maleFirstNames[(i + 20) % maleFirstNames.length]
    const lastName = lastNames[(i + 40) % lastNames.length]
    const studentId = `student-hifz-${i + 1}-${org.id}`
    
    const student = await prisma.student.create({
      data: {
        id: studentId,
        orgId: org.id,
        firstName,
        lastName,
        dob: new Date(2009 + (i % 7), i % 12, (i % 28) + 1),
        medicalNotes: i < 5 ? medicalNotes[(i + 20) % medicalNotes.length] : null, // Half have medical notes
        isArchived: false,
        updatedAt: new Date()
      }
    })
    
    await prisma.studentClass.create({
      data: {
        id: `student-class-${studentId}-${hifzClass.id}`,
        orgId: org.id,
        studentId: student.id,
        classId: hifzClass.id
      }
    })
    
    students.push(student)
  }
  console.log(`   ✅ Created 10 male students for ${hifzClass.name}`)

  // Step 5: Create parents for all students
  console.log('\n👨‍👩‍👧 Creating parents for all students...')
  
  const parentFirstNames = [
    'Mohammed', 'Amina', 'Yusuf', 'Sara', 'Omar', 'Layla', 'Hassan', 'Noor', 'Ibrahim', 'Zainab',
    'Abdullah', 'Fatima', 'Khalid', 'Aisha', 'Hamza', 'Maryam', 'Salman', 'Khadija', 'Faisal', 'Hafsa',
    'Tariq', 'Safiya', 'Zaid', 'Ruqayyah', 'Bilal', 'Sumayyah', 'Usman', 'Aminah', 'Ayan', 'Layla',
    'Armaan', 'Noor', 'Zayan', 'Hana', 'Rayyan', 'Sara', 'Ayaan', 'Mariam', 'Ishaan', 'Yasmin',
    'Rayan', 'Nadia', 'Aryan', 'Leila', 'Zain', 'Rania', 'Ahaan', 'Dina', 'Ahmad', 'Aaliyah'
  ]
  
  const parentLastNames = [
    'Khan', 'Ali', 'Ahmed', 'Hassan', 'Hussain', 'Malik', 'Sheikh', 'Rahman', 'Iqbal', 'Syed',
    'Mahmood', 'Butt', 'Chaudhry', 'Akhtar', 'Qureshi', 'Raza', 'Shah', 'Abbas', 'Hashmi', 'Javed',
    'Patel', 'Al-Rashid', 'Al-Mansour', 'Al-Zahrani', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Mutairi', 'Al-Shammari',
    'Ahmadzai', 'Mohammadi', 'Rahimi', 'Safi', 'Yousufzai', 'Karimi', 'Alaoui', 'Benali', 'Bennani', 'Cherkaoui',
    'El Fassi', 'Idrissi', 'Lahlou', 'Tazi', 'Bennani', 'Cherkaoui', 'Alaoui', 'Benali', 'Bennani', 'Cherkaoui'
  ]

  const parents = []
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const parentFirstName = parentFirstNames[i % parentFirstNames.length]
    const parentLastName = parentLastNames[i % parentLastNames.length]
    const parentEmail = `parent.${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@test.com`
    const parentPhone = `+44 7${Math.floor(Math.random() * 900000000) + 100000000}`
    
    const parent = await prisma.user.upsert({
      where: { email: parentEmail },
      update: {},
      create: {
        id: `parent-${student.id}`,
        name: `${parentFirstName} ${parentLastName}`,
        email: parentEmail,
        phone: parentPhone,
        emailVerified: new Date(),
        updatedAt: new Date()
      }
    })
    
    await prisma.userOrgMembership.upsert({
      where: {
        userId_orgId: {
          userId: parent.id,
          orgId: org.id
        }
      },
      update: {},
      create: {
        id: `membership-${parent.id}-${org.id}`,
        userId: parent.id,
        orgId: org.id,
        role: 'PARENT'
      }
    })
    
    await prisma.parentBillingProfile.upsert({
      where: {
        orgId_parentUserId: {
          orgId: org.id,
          parentUserId: parent.id
        }
      },
      update: {},
      create: {
        id: `billing-${parent.id}-${org.id}`,
        orgId: org.id,
        parentUserId: parent.id,
        preferredPaymentMethod: ['CASH', 'BANK_TRANSFER', 'STRIPE'][Math.floor(Math.random() * 3)],
        autoPayEnabled: Math.random() > 0.7,
        updatedAt: new Date()
      }
    })
    
    await prisma.student.update({
      where: { id: student.id },
      data: { primaryParentId: parent.id }
    })
    
    parents.push(parent)
  }
  console.log(`   ✅ Created ${parents.length} parents and linked them to students`)

  // Step 6: Create attendance records with specified distribution
  console.log('\n📊 Creating attendance records...')
  // 40 students >95%, 6 students 90-94%, 4 <89%
  
  const now = new Date()
  const oneMonthAgo = new Date(now)
  oneMonthAgo.setMonth(now.getMonth() - 1)
  
  let attendanceCount = 0
  const classDays = ['Monday', 'Wednesday', 'Friday'] // For regular classes
  const hifzDays = ['Tuesday', 'Thursday', 'Saturday'] // For hifz class
  
  // Calculate attendance rates
  const attendanceRates = []
  // 40 students with >95% attendance
  for (let i = 0; i < 40; i++) {
    attendanceRates.push(0.96 + Math.random() * 0.04) // 96-100%
  }
  // 6 students with 90-94% attendance
  for (let i = 0; i < 6; i++) {
    attendanceRates.push(0.90 + Math.random() * 0.04) // 90-94%
  }
  // 4 students with <89% attendance
  for (let i = 0; i < 4; i++) {
    attendanceRates.push(0.70 + Math.random() * 0.19) // 70-89%
  }
  
  for (let studentIdx = 0; studentIdx < students.length; studentIdx++) {
    const student = students[studentIdx]
    const attendanceRate = attendanceRates[studentIdx]
    
    // Find which class the student is in
    const studentClass = await prisma.studentClass.findFirst({
      where: { studentId: student.id },
      include: { Class: true }
    })
    
    if (!studentClass) continue
    
    const classItem = studentClass.Class
    const classDaysList = classItem.id === hifzClass.id ? hifzDays : classDays
    
    // Generate attendance for last month
    for (let day = 1; day <= 28; day++) {
      const date = new Date(oneMonthAgo.getFullYear(), oneMonthAgo.getMonth(), day)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      
      if (classDaysList.includes(dayName)) {
        const shouldBePresent = Math.random() < attendanceRate
        const status = shouldBePresent 
          ? (Math.random() > 0.1 ? 'PRESENT' : 'LATE')
          : 'ABSENT'
        
        try {
          await prisma.attendance.create({
            data: {
              id: `attendance-${student.id}-${classItem.id}-${date.getTime()}`,
              orgId: org.id,
              classId: classItem.id,
              studentId: student.id,
              date: date,
              status: status
            }
          })
          attendanceCount++
        } catch (error) {
          // Skip duplicates
        }
      }
    }
    
    // Also generate attendance for current week and past 3 weeks
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Monday of current week
    weekStart.setHours(0, 0, 0, 0)
    
    // Generate for current week and 3 weeks back
    for (let weekOffset = -3; weekOffset <= 0; weekOffset++) {
      const weekDate = new Date(weekStart)
      weekDate.setDate(weekStart.getDate() + (weekOffset * 7))
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekDate)
        date.setDate(weekDate.getDate() + dayOffset)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
        
        if (classDaysList.includes(dayName)) {
          const shouldBePresent = Math.random() < attendanceRate
          const status = shouldBePresent 
            ? (Math.random() > 0.1 ? 'PRESENT' : 'LATE')
            : 'ABSENT'
          
          try {
            await prisma.attendance.create({
              data: {
                id: `attendance-current-${student.id}-${classItem.id}-${date.getTime()}`,
                orgId: org.id,
                classId: classItem.id,
                studentId: student.id,
                date: date,
                status: status
              }
            })
            attendanceCount++
          } catch (error) {
            // Skip duplicates
          }
        }
      }
    }
  }
  
  console.log(`   ✅ Created ${attendanceCount} attendance records`)

  // Step 7: Create payment records
  console.log('\n💳 Creating payment records...')
  // 10% overdue, 10% late, rest paid on time
  
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  let paymentCount = 0
  const overdueCount = Math.floor(students.length * 0.1) // 10% overdue (5 students)
  const lateCount = Math.floor(students.length * 0.1) // 10% late (5 students)
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const studentClass = await prisma.studentClass.findFirst({
      where: { studentId: student.id },
      include: { Class: true }
    })
    
    if (!studentClass || !studentClass.Class.monthlyFeeP) continue
    
    const classItem = studentClass.Class
    let status = 'PAID'
    let paidAt: Date | null = currentMonth
    
    if (i < overdueCount) {
      status = 'OVERDUE'
      paidAt = null
    } else if (i < overdueCount + lateCount) {
      status = 'LATE'
      paidAt = new Date(currentMonth.getTime() + (15 + Math.random() * 10) * 24 * 60 * 60 * 1000) // 15-25 days late
    } else {
      // Paid on time (within 5 days of due date)
      paidAt = new Date(currentMonth.getTime() + (Math.random() * 5) * 24 * 60 * 60 * 1000)
    }
    
    const monthStr = currentMonth.toISOString().substring(0, 7)
    
    try {
      await prisma.monthlyPaymentRecord.create({
        data: {
          id: `payment-${student.id}-${classItem.id}-${monthStr}`,
          orgId: org.id,
          studentId: student.id,
          classId: classItem.id,
          month: monthStr,
          amountP: classItem.monthlyFeeP,
          status: status,
          method: status === 'PAID' ? ['CASH', 'BANK_TRANSFER', 'STRIPE'][Math.floor(Math.random() * 3)] : null,
          paidAt: paidAt,
          reference: status === 'PAID' ? `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
          createdAt: currentMonth,
          updatedAt: new Date()
        }
      })
      paymentCount++
    } catch (error) {
      // Skip duplicates
    }
    
    // Also create last month's payment (should be paid)
    const lastMonthStr = lastMonth.toISOString().substring(0, 7)
    try {
      await prisma.monthlyPaymentRecord.create({
        data: {
          id: `payment-${student.id}-${classItem.id}-${lastMonthStr}`,
          orgId: org.id,
          studentId: student.id,
          classId: classItem.id,
          month: lastMonthStr,
          amountP: classItem.monthlyFeeP,
          status: 'PAID',
          method: ['CASH', 'BANK_TRANSFER', 'STRIPE'][Math.floor(Math.random() * 3)],
          paidAt: new Date(lastMonth.getTime() + (Math.random() * 5) * 24 * 60 * 60 * 1000),
          reference: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          createdAt: lastMonth,
          updatedAt: new Date()
        }
      })
      paymentCount++
    } catch (error) {
      // Skip duplicates
    }
  }
  
  console.log(`   ✅ Created ${paymentCount} payment records`)
  console.log(`      - ${overdueCount} overdue (10%)`)
  console.log(`      - ${lateCount} late (10%)`)
  console.log(`      - ${students.length - overdueCount - lateCount} paid on time (80%)`)

  // Summary
  console.log('\n' + '─'.repeat(80))
  console.log('✅ DEMO DATA RESET COMPLETE\n')
  console.log(`📊 Summary:`)
  console.log(`   Organization: ${org.name}`)
  console.log(`   Classes: 3 (2 × £50/month, 1 × £70/month)`)
  console.log(`   Students: 50 (20 male, 20 female, 10 hifz)`)
  console.log(`   Teachers: 3 (1 female for female class)`)
  console.log(`   Admin: 1 (admin@test.com)`)
  console.log(`   Parents: 50 (all students have parents)`)
  console.log(`   Attendance: 40 >95%, 6 90-94%, 4 <89%`)
  console.log(`   Medical Notes: 25 students (50%)`)
  console.log(`   Payment Records: ${paymentCount} (10% overdue, 10% late, 80% paid)`)
  console.log(`   Attendance Records: ${attendanceCount}`)
  console.log('\n⚠️  All demo data has been reset and recreated.\n')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    console.error('Stack:', e.stack)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await prisma.$disconnect()
      console.log('✅ Database connection closed')
    } catch (error) {
      console.error('Error closing database connection:', error)
    }
  })

