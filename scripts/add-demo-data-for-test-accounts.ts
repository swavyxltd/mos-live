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

  // Step 0: Set up payment details for the organization (make it look like they have a subscription)
  console.log('💳 Setting up payment details for organization...')
  const billingAnniversaryDate = org.createdAt.getDate()
  const trialEndDate = new Date(org.createdAt)
  trialEndDate.setMonth(trialEndDate.getMonth() + 1)
  
  // Use fake Stripe IDs that won't conflict with real data (prefixed with demo_)
  const fakeStripeCustomerId = `cus_demo_${org.id.substring(0, 24)}`
  const fakePaymentMethodId = `pm_demo_${org.id.substring(0, 24)}`
  const fakeSubscriptionId = `sub_demo_${org.id.substring(0, 24)}`
  const fakeSubscriptionItemId = `si_demo_${org.id.substring(0, 24)}`
  
  await prisma.platformOrgBilling.upsert({
    where: { orgId: org.id },
    update: {
      stripeCustomerId: fakeStripeCustomerId,
      defaultPaymentMethodId: fakePaymentMethodId,
      stripeSubscriptionId: fakeSubscriptionId,
      stripeSubscriptionItemId: fakeSubscriptionItemId,
      subscriptionStatus: 'active',
      billingAnniversaryDate,
      trialEndDate,
      updatedAt: new Date()
    },
    create: {
      id: `billing_demo_${org.id}`,
      orgId: org.id,
      stripeCustomerId: fakeStripeCustomerId,
      defaultPaymentMethodId: fakePaymentMethodId,
      stripeSubscriptionId: fakeSubscriptionId,
      stripeSubscriptionItemId: fakeSubscriptionItemId,
      subscriptionStatus: 'active',
      billingAnniversaryDate,
      trialEndDate,
      updatedAt: new Date()
    }
  })
  
  console.log(`   ✅ Payment details configured (demo Stripe IDs - not real)`)

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
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '5:00 PM',
          endTime: '7:00 PM'
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

  // Update staff user - set to ADMIN role for full editing permissions in demos
  // Change to 'STAFF' if you want limited permissions for demonstration
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
        role: 'ADMIN' // Set to ADMIN for full editing permissions, or 'STAFF' for limited
      }
    })
    console.log(`\n✅ Updated staff@test.com to ADMIN role (full editing permissions)`)
  }

  // Step 2: Create 100 students (20 per class) with proper Muslim names
  console.log('\n👥 Creating 100 students (20 per class) with proper Muslim names...')
  
  // Proper Muslim names from various countries
  const maleFirstNames = [
    // Arabic/Saudi
    'Ahmed', 'Muhammad', 'Omar', 'Ali', 'Hassan', 'Hussein', 'Ibrahim', 'Yusuf', 'Khalid', 'Hamza',
    'Abdullah', 'Abdul Rahman', 'Abdul Aziz', 'Salman', 'Faisal', 'Saeed', 'Tariq', 'Zaid', 'Bilal', 'Usman',
    // Indian/Pakistani
    'Ayan', 'Armaan', 'Zayan', 'Rayyan', 'Ayaan', 'Ishaan', 'Rayan', 'Aryan', 'Zain', 'Ahaan',
    // Afghan
    'Ahmad', 'Ahmad Shah', 'Farid', 'Karim', 'Noor', 'Rahim', 'Sami', 'Wali', 'Yasin', 'Zahir',
    // Moroccan
    'Amine', 'Anas', 'Ayoub', 'Bilal', 'Hicham', 'Idris', 'Mehdi', 'Nabil', 'Othman', 'Reda'
  ]
  
  const femaleFirstNames = [
    // Arabic/Saudi
    'Fatima', 'Aisha', 'Maryam', 'Khadija', 'Zainab', 'Aminah', 'Hafsa', 'Safiya', 'Ruqayyah', 'Sumayyah',
    'Layla', 'Noor', 'Hana', 'Sara', 'Mariam', 'Yasmin', 'Nadia', 'Leila', 'Rania', 'Dina',
    // Indian/Pakistani
    'Aaliyah', 'Ayesha', 'Haniya', 'Inaya', 'Iman', 'Layla', 'Maryam', 'Noor', 'Sana', 'Zara',
    // Afghan
    'Farah', 'Laila', 'Mariam', 'Nadia', 'Parisa', 'Roya', 'Sahar', 'Samira', 'Soraya', 'Zahra',
    // Moroccan
    'Aicha', 'Amina', 'Fatima', 'Hafsa', 'Imane', 'Khadija', 'Layla', 'Mariam', 'Nour', 'Salma'
  ]
  
  const lastNames = [
    // Pakistani/Indian
    'Khan', 'Ali', 'Ahmed', 'Hassan', 'Hussain', 'Malik', 'Sheikh', 'Rahman', 'Iqbal', 'Syed',
    'Mahmood', 'Butt', 'Chaudhry', 'Akhtar', 'Qureshi', 'Raza', 'Shah', 'Abbas', 'Hashmi', 'Javed',
    // Arabic/Saudi
    'Al-Saud', 'Al-Rashid', 'Al-Mansour', 'Al-Zahrani', 'Al-Ghamdi', 'Al-Otaibi', 'Al-Mutairi', 'Al-Shammari',
    // Afghan
    'Ahmadzai', 'Khan', 'Mohammadi', 'Rahimi', 'Safi', 'Yousufzai', 'Zahir', 'Karimi',
    // Moroccan
    'Alaoui', 'Benali', 'Bennani', 'Cherkaoui', 'El Fassi', 'Idrissi', 'Lahlou', 'Tazi'
  ]

  const students = []
  let studentIndex = 0

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const classItem = classes[classIndex]
    
    for (let i = 0; i < 20; i++) {
      // Alternate between male and female names
      const isMale = studentIndex % 2 === 0
      const firstNamePool = isMale ? maleFirstNames : femaleFirstNames
      const firstName = firstNamePool[studentIndex % firstNamePool.length]
      const lastName = lastNames[studentIndex % lastNames.length]

      const studentId = `demo-student-${studentIndex + 1}-${org.id}`
      const student = await prisma.student.upsert({
        where: { id: studentId },
        update: {},
        create: {
          id: studentId,
          orgId: org.id,
          firstName: firstName,
          lastName: lastName,
          dob: new Date(2010 + (studentIndex % 10), studentIndex % 12, (studentIndex % 28) + 1),
          isArchived: false,
          updatedAt: new Date(),
          StudentClass: {
            create: {
              id: `demo-student-class-${studentIndex + 1}-${org.id}`,
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
          id: `demo-student-class-${studentIndex + 1}-${org.id}`,
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

  // Step 3.5: Create 15 additional parent users with proper Muslim names
  console.log('\n👨‍👩‍👧 Creating 15 additional parent users with proper Muslim names...')
  const additionalParentNames = [
    { firstName: 'Mohammed', lastName: 'Iqbal', email: 'mohammed.iqbal.parent@test.com' },
    { firstName: 'Amina', lastName: 'Hassan', email: 'amina.hassan.parent@test.com' },
    { firstName: 'Yusuf', lastName: 'Ali', email: 'yusuf.ali.parent@test.com' },
    { firstName: 'Sara', lastName: 'Ahmed', email: 'sara.ahmed.parent@test.com' },
    { firstName: 'Omar', lastName: 'Khan', email: 'omar.khan.parent@test.com' },
    { firstName: 'Layla', lastName: 'Malik', email: 'layla.malik.parent@test.com' },
    { firstName: 'Hassan', lastName: 'Sheikh', email: 'hassan.sheikh.parent@test.com' },
    { firstName: 'Noor', lastName: 'Rahman', email: 'noor.rahman.parent@test.com' },
    { firstName: 'Ibrahim', lastName: 'Syed', email: 'ibrahim.syed.parent@test.com' },
    { firstName: 'Zainab', lastName: 'Patel', email: 'zainab.patel.parent@test.com' },
    { firstName: 'Abdullah', lastName: 'Mahmood', email: 'abdullah.mahmood.parent@test.com' },
    { firstName: 'Fatima', lastName: 'Butt', email: 'fatima.butt.parent@test.com' },
    { firstName: 'Khalid', lastName: 'Chaudhry', email: 'khalid.chaudhry.parent@test.com' },
    { firstName: 'Aisha', lastName: 'Qureshi', email: 'aisha.qureshi.parent@test.com' },
    { firstName: 'Hamza', lastName: 'Raza', email: 'hamza.raza.parent@test.com' }
  ]

  const additionalParents = []
  let studentIndexForParents = 2 // Start from student index 2 (after the 2 linked to parent@test.com)
  
  for (const parentData of additionalParentNames) {
    try {
      const parentId = `demo-parent-${parentData.email.replace('@', '-').replace(/\./g, '-')}-${org.id}`
      const newParent = await prisma.user.upsert({
        where: { email: parentData.email },
        update: {},
        create: {
          id: parentId,
          name: `${parentData.firstName} ${parentData.lastName}`,
          email: parentData.email,
          phone: `+44${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          emailVerified: new Date(),
          updatedAt: new Date()
        }
      })

      // Add parent to organization
      await prisma.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: newParent.id,
            orgId: org.id
          }
        },
        update: {},
        create: {
          id: `demo-membership-${newParent.id}-${org.id}`,
          userId: newParent.id,
          orgId: org.id,
          role: 'PARENT'
        }
      })

      // Create parent billing profile
      await prisma.parentBillingProfile.upsert({
        where: {
          orgId_parentUserId: {
            orgId: org.id,
            parentUserId: newParent.id
          }
        },
        update: {},
        create: {
          id: `demo-parent-billing-${newParent.id}-${org.id}`,
          orgId: org.id,
          parentUserId: newParent.id,
          preferredPaymentMethod: Math.random() > 0.5 ? 'CASH' : 'BANK_TRANSFER',
          autoPayEnabled: Math.random() > 0.7,
          updatedAt: new Date()
        }
      })

      // Link 1-3 children to this parent (distribute remaining students)
      const numChildren = Math.min(
        Math.floor(Math.random() * 3) + 1, // 1-3 children
        students.length - studentIndexForParents // Don't exceed available students
      )
      
      const childrenToLink = students.slice(studentIndexForParents, studentIndexForParents + numChildren)
      for (const child of childrenToLink) {
        await prisma.student.update({
          where: { id: child.id },
          data: {
            primaryParentId: newParent.id
          }
        })
      }

      const childrenNames = childrenToLink.map(c => `${c.firstName} ${c.lastName}`).join(', ')
      console.log(`   ✅ Created parent: ${parentData.firstName} ${parentData.lastName} (linked to ${numChildren} child/ren: ${childrenNames})`)
      
      additionalParents.push(newParent)
      studentIndexForParents += numChildren
      
      // Stop if we've linked all students
      if (studentIndexForParents >= students.length) {
        break
      }
    } catch (error) {
      console.error(`   ⚠️  Error creating parent ${parentData.email}:`, error)
      // Continue with next parent
    }
  }

  console.log(`\n✅ Created ${additionalParents.length} additional parent users`)

  // Step 4: Create 1 month of attendance data + current week
  console.log('\n📊 Creating 1 month of attendance data + current week...')
  const now = new Date()
  const oneMonthAgo = new Date(now)
  oneMonthAgo.setMonth(now.getMonth() - 1)
  
  // Also create attendance for current week to ensure dashboard shows data
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)

  let attendanceCount = 0
  const statuses = ['PRESENT', 'ABSENT', 'LATE', 'PRESENT', 'PRESENT'] // 60% present rate

  // Generate attendance for each class, for each student, for each day in the last 1 month
  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    const classItem = classes[classIdx]
    console.log(`   Processing class ${classIdx + 1}/${classes.length}: ${classItem.name}...`)
    
    try {
      // Get students enrolled in this class
      const studentClasses = await prisma.studentClass.findMany({
        where: { classId: classItem.id },
        include: { Student: true }
      })
      const classStudents = studentClasses.map(sc => sc.Student)

      // Get class schedule days (Monday-Friday)
      const schedule = JSON.parse(classItem.schedule)
      const classDays = schedule.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

      // Generate attendance for the last 1 month
      for (let monthOffset = 0; monthOffset < 1; monthOffset++) {
        const monthDate = new Date(oneMonthAgo)
        monthDate.setMonth(oneMonthAgo.getMonth() + monthOffset)

        // For each day in the month
        for (let day = 1; day <= 28; day++) { // Use 28 days to avoid month-end issues
          const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

          // Only create attendance for scheduled class days
          if (classDays.includes(dayName)) {
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
                  update: {},
                  create: {
                    id: `demo-attendance-${classItem.id}-${student.id}-${date.getTime()}`,
                    orgId: org.id,
                    classId: classItem.id,
                    studentId: student.id,
                    date: date,
                    status: status
                  }
                })
                attendanceCount++
              } catch (error) {
                // Skip duplicate or error, continue with next record
                if (attendanceCount % 100 === 0) {
                  console.log(`      Progress: ${attendanceCount} attendance records created...`)
                }
              }
            }
          }
        }
      }
      
      // Also create attendance for current week to ensure dashboard shows data
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + dayOffset)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
        
        // Only create attendance for scheduled class days
        if (classDays.includes(dayName)) {
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
                update: {},
                create: {
                  id: `demo-attendance-current-${classItem.id}-${student.id}-${date.getTime()}`,
                  orgId: org.id,
                  classId: classItem.id,
                  studentId: student.id,
                  date: date,
                  status: status
                }
              })
              attendanceCount++
            } catch (error) {
              // Skip duplicate or error, continue with next record
            }
          }
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Error processing class ${classItem.name}:`, error)
      // Continue with next class
    }
  }

  console.log(`   ✅ Created ${attendanceCount} attendance records`)

  // Step 5: Create payment records for the last 1 month
  console.log('\n💳 Creating payment records for the last 1 month...')
  let paymentCount = 0
  const paymentMethods = ['CASH', 'BANK_TRANSFER']
  const paymentStatuses = ['PAID', 'PENDING', 'LATE', 'OVERDUE']

  for (let studentIdx = 0; studentIdx < students.length; studentIdx++) {
    const student = students[studentIdx]
    if ((studentIdx + 1) % 20 === 0) {
      console.log(`   Progress: Processing student ${studentIdx + 1}/${students.length}...`)
    }
    
    try {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: student.id },
        include: { Class: true }
      })

      for (const studentClass of studentClasses) {
        const classItem = studentClass.Class
        if (!classItem.monthlyFeeP) continue

        // Create payment records for last 1 month
        for (let monthOffset = 0; monthOffset < 1; monthOffset++) {
          const monthDate = new Date(now)
          monthDate.setMonth(now.getMonth() - monthOffset)
          monthDate.setDate(1) // First of the month

          // Determine status based on month - more realistic distribution
          let status = 'PAID'
          if (monthOffset === 0) {
            // Current month - mix of statuses (60% paid, 20% pending, 15% late, 5% overdue)
            const rand = Math.random()
            if (rand < 0.6) status = 'PAID'
            else if (rand < 0.8) status = 'PENDING'
            else if (rand < 0.95) status = 'LATE'
            else status = 'OVERDUE'
          } else {
            // Past months - mostly paid
            status = Math.random() > 0.15 ? 'PAID' : 'LATE'
          }

          const paymentMethod = status === 'PAID' 
            ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
            : null

          const monthStr = monthDate.toISOString().substring(0, 7) // Format: YYYY-MM

          try {
            await prisma.monthlyPaymentRecord.upsert({
              where: {
                studentId_classId_month: {
                  studentId: student.id,
                  classId: classItem.id,
                  month: monthStr
                }
              },
              update: {},
              create: {
                id: `demo-payment-${student.id}-${classItem.id}-${monthStr}`,
                orgId: org.id,
                studentId: student.id,
                classId: classItem.id,
                month: monthStr,
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
          } catch (error) {
            // Skip duplicate or error, continue with next record
          }
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Error processing student ${student.firstName} ${student.lastName}:`, error)
      // Continue with next student
    }
  }

  console.log(`   ✅ Created ${paymentCount} payment records`)

  // Step 6: Create additional staff members
  console.log('\n👨‍🏫 Creating additional staff members...')
  const staffNames = [
    { firstName: 'Umar', lastName: 'Al-Rashid', email: 'umar.teacher@test.com' },
    { firstName: 'Fatima', lastName: 'Khan', email: 'fatima.teacher@test.com' },
    { firstName: 'Ibrahim', lastName: 'Ahmed', email: 'ibrahim.teacher@test.com' },
    { firstName: 'Aisha', lastName: 'Malik', email: 'aisha.teacher@test.com' },
    { firstName: 'Hassan', lastName: 'Sheikh', email: 'hassan.teacher@test.com' }
  ]

  const additionalStaff = []
  for (const staffData of staffNames) {
    try {
      const staffId = `demo-staff-${staffData.email.replace('@', '-').replace(/\./g, '-')}-${org.id}`
      const staffUser = await prisma.user.upsert({
        where: { email: staffData.email },
        update: {},
        create: {
          id: staffId,
          name: `${staffData.firstName} ${staffData.lastName}`,
          email: staffData.email,
          phone: `+44${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          emailVerified: new Date(),
          updatedAt: new Date()
        }
      })

      // Add staff to organization
      await prisma.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: staffUser.id,
            orgId: org.id
          }
        },
        update: {},
        create: {
          id: `demo-membership-${staffUser.id}-${org.id}`,
          userId: staffUser.id,
          orgId: org.id,
          role: 'STAFF'
        }
      })

      // Assign to a class (ensure all classes have at least one teacher)
      // First, assign teachers to classes that don't have teachers yet
      let assignedClass = null
      for (const classItem of classes) {
        const classWithTeacher = await prisma.class.findUnique({
          where: { id: classItem.id },
          select: { teacherId: true }
        })
        if (!classWithTeacher?.teacherId) {
          await prisma.class.update({
            where: { id: classItem.id },
            data: { teacherId: staffUser.id }
          })
          assignedClass = classItem
          break
        }
      }
      
      // If all classes already have teachers, assign to first class (or distribute evenly)
      if (!assignedClass) {
        const classIndex = additionalStaff.length % classes.length
        assignedClass = classes[classIndex]
        await prisma.class.update({
          where: { id: assignedClass.id },
          data: { teacherId: staffUser.id }
        })
      }

      additionalStaff.push(staffUser)
      console.log(`   ✅ Created staff: ${staffData.firstName} ${staffData.lastName} (assigned to "${assignedClass.name}")`)
    } catch (error) {
      console.error(`   ⚠️  Error creating staff ${staffData.email}:`, error)
      // Continue with next staff
    }
  }

  // Step 7: Create fake applications
  console.log('\n📝 Creating fake applications...')
  const guardianNames = [
    { firstName: 'Mohammed', lastName: 'Iqbal', email: 'mohammed.iqbal@demo.com' },
    { firstName: 'Amina', lastName: 'Hassan', email: 'amina.hassan@demo.com' },
    { firstName: 'Yusuf', lastName: 'Ali', email: 'yusuf.ali@demo.com' },
    { firstName: 'Sara', lastName: 'Ahmed', email: 'sara.ahmed@demo.com' },
    { firstName: 'Omar', lastName: 'Khan', email: 'omar.khan@demo.com' },
    { firstName: 'Layla', lastName: 'Malik', email: 'layla.malik@demo.com' },
    { firstName: 'Hassan', lastName: 'Sheikh', email: 'hassan.sheikh@demo.com' },
    { firstName: 'Noor', lastName: 'Rahman', email: 'noor.rahman@demo.com' },
    { firstName: 'Ibrahim', lastName: 'Syed', email: 'ibrahim.syed@demo.com' },
    { firstName: 'Zainab', lastName: 'Patel', email: 'zainab.patel@demo.com' }
  ]

  // More realistic application status distribution
  const applicationStatuses = ['NEW', 'NEW', 'NEW', 'REVIEWED', 'REVIEWED', 'ACCEPTED', 'ACCEPTED', 'REJECTED', 'NEW', 'REVIEWED']
  let applicationCount = 0

  for (let i = 0; i < guardianNames.length; i++) {
    try {
      const guardian = guardianNames[i]
      const status = applicationStatuses[i % applicationStatuses.length]
      const submittedDate = new Date()
      submittedDate.setDate(submittedDate.getDate() - (i * 2)) // Stagger submission dates

      // Create 1-2 children per application
      const numChildren = Math.random() > 0.5 ? 1 : 2
      const children = []
      
      for (let j = 0; j < numChildren; j++) {
        const isMale = Math.random() > 0.5
        const firstNamePool = isMale ? maleFirstNames : femaleFirstNames
        const childFirstName = firstNamePool[Math.floor(Math.random() * firstNamePool.length)]
        const childLastName = guardian.lastName
        
        children.push({
          firstName: childFirstName,
          lastName: childLastName,
          dob: new Date(2015 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          gender: isMale ? 'Male' : 'Female'
        })
      }

      const application = await prisma.application.create({
        data: {
          id: `demo-application-${i + 1}-${org.id}`,
          orgId: org.id,
          status: status,
          guardianName: `${guardian.firstName} ${guardian.lastName}`,
          guardianPhone: `+44${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          guardianEmail: guardian.email,
          guardianAddress: `${Math.floor(Math.random() * 999) + 1} High Street, London, UK`,
          preferredClass: classes[i % classes.length].name,
          preferredTerm: 'September 2024',
          preferredStartDate: new Date(2024, 8, 1),
          additionalNotes: i % 3 === 0 ? 'Looking forward to joining the madrasah community.' : null,
          submittedAt: submittedDate,
          updatedAt: submittedDate,
          ApplicationChild: {
            create: children.map((child, idx) => ({
              id: `demo-app-child-${i + 1}-${idx}-${org.id}`,
              firstName: child.firstName,
              lastName: child.lastName,
              dob: child.dob,
              gender: child.gender,
              updatedAt: new Date()
            }))
          }
        }
      })

      applicationCount++
      console.log(`   ✅ Created application: ${guardian.firstName} ${guardian.lastName} (${status}, ${numChildren} child/ren)`)
    } catch (error) {
      console.error(`   ⚠️  Error creating application ${i + 1}:`, error)
      // Continue with next application
    }
  }

  // Verify all classes have teachers assigned
  console.log('\n🔍 Verifying teacher assignments...')
  const allClasses = await prisma.class.findMany({
    where: { orgId: org.id },
    include: { User: { select: { name: true, email: true } } }
  })
  
  for (const classItem of allClasses) {
    if (classItem.teacherId && classItem.User) {
      console.log(`   ✅ ${classItem.name}: ${classItem.User.name}`)
    } else {
      console.log(`   ⚠️  ${classItem.name}: NO TEACHER ASSIGNED`)
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(80))
  console.log('✅ DEMO DATA CREATION COMPLETE\n')
  console.log(`📊 Summary:`)
  console.log(`   Organization: ${org.name}`)
  console.log(`   Classes: ${classes.length}`)
  console.log(`   Students: ${students.length}`)
  console.log(`   Staff Members: ${additionalStaff.length + 1} (including staff@test.com)`)
  console.log(`   Parent Users: ${additionalParents.length + 1} (including parent@test.com)`)
  console.log(`   Applications: ${applicationCount}`)
  console.log(`   Attendance Records: ${attendanceCount}`)
  console.log(`   Payment Records: ${paymentCount}`)
  console.log(`   Staff Account: staff@test.com (assigned to "${classes[0].name}")`)
  console.log(`   Parent Account: parent@test.com (linked to 2 children)`)
  console.log(`   Additional Parents: ${additionalParents.length} parents with proper Muslim names`)
  console.log('\n⚠️  IMPORTANT: This data is isolated to the test organization only.')
  console.log('   It will NOT appear in owner accounts or other organizations.\n')
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
      console.log('\n✅ Database connection closed')
    } catch (error) {
      console.error('Error closing database connection:', error)
    }
  })

