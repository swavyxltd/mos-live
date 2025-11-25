import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo organization
  const org = await prisma.org.upsert({
    where: { slug: 'leicester-islamic-centre' },
    update: {},
    create: {
      name: 'Leicester Islamic Centre',
      slug: 'leicester-islamic-centre',
      timezone: 'Europe/London',
      settings: JSON.stringify({
        lateThreshold: 15, // 15 minutes
        remindersEnabled: true,
        hijriCalendar: false
      })
    }
  })

  console.log('✅ Created organization:', org.name)

  // Create users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'owner@demo.com' },
      update: {},
      create: {
        email: 'owner@demo.com',
        name: 'Ahmed Hassan',
        phone: '+44 7700 900123',
        isSuperAdmin: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: {
        email: 'admin@demo.com',
        name: 'Fatima Ali',
        phone: '+44 7700 900124'
      }
    }),
    prisma.user.upsert({
      where: { email: 'staff@demo.com' },
      update: {},
      create: {
        email: 'staff@demo.com',
        name: 'Omar Khan',
        phone: '+44 7700 900125'
      }
    }),
    prisma.user.upsert({
      where: { email: 'parent@demo.com' },
      update: {},
      create: {
        email: 'parent@demo.com',
        name: 'Aisha Patel',
        phone: '+44 7700 900126'
      }
    })
  ])

  console.log('✅ Created users')

  // Create user-org memberships
  await Promise.all([
    prisma.userOrgMembership.upsert({
      where: { userId_orgId: { userId: users[0].id, orgId: org.id } },
      update: {},
      create: {
        userId: users[0].id,
        orgId: org.id,
        role: 'OWNER'
      }
    }),
    prisma.userOrgMembership.upsert({
      where: { userId_orgId: { userId: users[1].id, orgId: org.id } },
      update: {},
      create: {
        userId: users[1].id,
        orgId: org.id,
        role: 'ADMIN'
      }
    }),
    prisma.userOrgMembership.upsert({
      where: { userId_orgId: { userId: users[2].id, orgId: org.id } },
      update: {},
      create: {
        userId: users[2].id,
        orgId: org.id,
        role: 'STAFF'
      }
    }),
    prisma.userOrgMembership.upsert({
      where: { userId_orgId: { userId: users[3].id, orgId: org.id } },
      update: {},
      create: {
        userId: users[3].id,
        orgId: org.id,
        role: 'PARENT'
      }
    })
  ])

  console.log('✅ Created user memberships')

  // Create class
  const class1 = await prisma.class.create({
    data: {
      orgId: org.id,
      name: 'Quran Class - Level 1',
      description: 'Basic Quran recitation and memorization for beginners',
      teacherId: users[2].id, // Omar Khan
      schedule: JSON.stringify({
        days: ['monday', 'tuesday', 'wednesday', 'thursday'],
        startTime: '17:30',
        endTime: '19:00'
      })
    }
  })

  console.log('✅ Created class:', class1.name)

  // Create students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        orgId: org.id,
        firstName: 'Hassan',
        lastName: 'Patel',
        dob: new Date('2015-03-15'),
        allergies: 'None',
        medicalNotes: 'Wears glasses',
        primaryParentId: users[3].id // Aisha Patel
      }
    }),
    prisma.student.create({
      data: {
        orgId: org.id,
        firstName: 'Amina',
        lastName: 'Patel',
        dob: new Date('2016-07-22'),
        allergies: 'Peanuts',
        medicalNotes: 'Carry EpiPen',
        primaryParentId: users[3].id // Aisha Patel
      }
    }),
    prisma.student.create({
      data: {
        orgId: org.id,
        firstName: 'Yusuf',
        lastName: 'Ahmed',
        dob: new Date('2014-11-08'),
        allergies: 'None',
        medicalNotes: 'None',
        primaryParentId: users[3].id // Aisha Patel (for demo)
      }
    })
  ])

  console.log('✅ Created students')

  // Enroll students in class
  await Promise.all(
    students.map(student =>
      prisma.studentClass.create({
        data: {
          orgId: org.id,
          studentId: student.id,
          classId: class1.id
        }
      })
    )
  )

  console.log('✅ Enrolled students in class')

  // Create fees plan
  const feesPlan = await prisma.feesPlan.create({
    data: {
      orgId: org.id,
      name: 'Monthly Tuition',
      amountP: 5000, // £50.00
      cadence: 'MONTHLY',
      isActive: true
    }
  })

  console.log('✅ Created fees plan')

  // Create invoices
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        orgId: org.id,
        studentId: students[0].id,
        amountP: 5000, // £50.00
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'SENT'
      }
    }),
    prisma.invoice.create({
      data: {
        orgId: org.id,
        studentId: students[1].id,
        amountP: 5000, // £50.00
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'PAID',
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        paidMethod: 'CASH'
      }
    })
  ])

  console.log('✅ Created invoices')

  // Create payment for paid invoice
  await prisma.payment.create({
    data: {
      orgId: org.id,
      invoiceId: invoices[1].id,
      method: 'CASH',
      amountP: 5000,
      status: 'SUCCEEDED',
      providerId: 'cash_' + Date.now()
    }
  })

  console.log('✅ Created payment record')

  // Create attendance records (last 7 days)
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    // Only create attendance for weekdays when class runs
    const dayOfWeek = date.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
      await Promise.all(
        students.map(student =>
          prisma.attendance.create({
            data: {
              orgId: org.id,
              classId: class1.id,
              studentId: student.id,
              date,
              status: Math.random() > 0.1 ? 'PRESENT' : Math.random() > 0.5 ? 'LATE' : 'ABSENT'
            }
          })
        )
      )
    }
  }

  console.log('✅ Created attendance records')

  // Create progress logs
  await Promise.all([
    prisma.progressLog.create({
      data: {
        orgId: org.id,
        studentId: students[0].id,
        body: 'Hassan has been making excellent progress with Surah Al-Fatiha. He can now recite it fluently and is working on memorization.',
        createdById: users[2].id // Omar Khan
      }
    }),
    prisma.progressLog.create({
      data: {
        orgId: org.id,
        studentId: students[1].id,
        body: 'Amina shows great enthusiasm in class. She needs more practice with proper pronunciation of Arabic letters.',
        createdById: users[2].id // Omar Khan
      }
    })
  ])

  console.log('✅ Created progress logs')

  // Create messages
  await prisma.message.create({
    data: {
      orgId: org.id,
      title: 'Welcome to the New Academic Year',
      body: 'Assalamu\'alaikum! We are excited to welcome all students and parents to the new academic year. Classes will begin on Monday.',
      audience: 'ALL',
      channel: 'EMAIL',
      status: 'SENT',
      targets: JSON.stringify({ allParents: true })
    }
  })

  console.log('✅ Created message')

  // Create holiday
  await prisma.holiday.create({
    data: {
      orgId: org.id,
      name: 'Eid al-Fitr',
      startDate: new Date('2024-04-10'),
      endDate: new Date('2024-04-12')
    }
  })

  console.log('✅ Created holiday')

  // Create term
  await prisma.term.create({
    data: {
      orgId: org.id,
      name: 'Spring Term 2024',
      startDate: new Date('2024-01-08'),
      endDate: new Date('2024-03-29')
    }
  })

  console.log('✅ Created term')

  // Create exam
  await prisma.exam.create({
    data: {
      orgId: org.id,
      title: 'Quran Recitation Test',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      classId: class1.id,
      notes: 'Students will be tested on Surah Al-Fatiha and basic Arabic letters.'
    }
  })

  console.log('✅ Created exam')

  // Create invitation
  await prisma.invitation.create({
    data: {
      orgId: org.id,
      email: 'newparent@example.com',
      role: 'PARENT',
      token: 'invite_token_' + Date.now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }
  })

  console.log('✅ Created invitation')

  // Create audit logs
  await Promise.all([
    prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: users[1].id, // Fatima Ali
        action: 'CREATE_STUDENT',
        targetType: 'Student',
        targetId: students[0].id,
        data: JSON.stringify({ studentName: 'Hassan Patel' })
      }
    }),
    prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: users[1].id, // Fatima Ali
        action: 'CREATE_INVOICE',
        targetType: 'Invoice',
        targetId: invoices[0].id,
        data: JSON.stringify({ amount: 5000, studentName: 'Hassan Patel' })
      }
    }),
    prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: users[2].id, // Omar Khan
        action: 'SEND_MESSAGE',
        targetType: 'Message',
        targetId: 'msg_1',
        data: JSON.stringify({ title: 'Welcome to the New Academic Year' })
      }
    })
  ])

  console.log('✅ Created audit logs')

  // Create platform billing (stubbed)
  await prisma.platformOrgBilling.create({
    data: {
      orgId: org.id,
      stripeCustomerId: 'cus_demo_' + Date.now(),
      stripeSubscriptionItemId: 'si_demo_' + Date.now(),
      lastUsageReportedAt: new Date()
    }
  })

  console.log('✅ Created platform billing')

  // Create additional demo organizations for owner portal
  const org2 = await prisma.org.create({
    data: {
      name: 'Manchester Islamic School',
      slug: 'manchester-islamic-school',
      timezone: 'Europe/London',
      settings: JSON.stringify({
        lateThreshold: 10,
        remindersEnabled: true,
        hijriCalendar: true
      })
    }
  })

  const org3 = await prisma.org.create({
    data: {
      name: 'Birmingham Quran Academy',
      slug: 'birmingham-quran-academy',
      timezone: 'Europe/London',
      settings: JSON.stringify({
        lateThreshold: 20,
        remindersEnabled: false,
        hijriCalendar: false
      })
    }
  })

  // Create additional users for other orgs
  const additionalUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin2@demo.com',
        name: 'Sarah Ahmed',
        phone: '+44 7700 900127'
      }
    }),
    prisma.user.create({
      data: {
        email: 'teacher2@demo.com',
        name: 'Mohammed Ali',
        phone: '+44 7700 900128'
      }
    }),
    prisma.user.create({
      data: {
        email: 'parent2@demo.com',
        name: 'Fatima Khan',
        phone: '+44 7700 900129'
      }
    })
  ])

  // Create memberships for additional orgs
  await Promise.all([
    prisma.userOrgMembership.create({
      data: {
        userId: additionalUsers[0].id,
        orgId: org2.id,
        role: 'ADMIN'
      }
    }),
    prisma.userOrgMembership.create({
      data: {
        userId: additionalUsers[1].id,
        orgId: org2.id,
        role: 'STAFF'
      }
    }),
    prisma.userOrgMembership.create({
      data: {
        userId: additionalUsers[2].id,
        orgId: org2.id,
        role: 'PARENT'
      }
    }),
    prisma.userOrgMembership.create({
      data: {
        userId: users[1].id, // Fatima Ali
        orgId: org3.id,
        role: 'ADMIN'
      }
    })
  ])

  // Create students for additional orgs
  const additionalStudents = await Promise.all([
    prisma.student.create({
      data: {
        orgId: org2.id,
        firstName: 'Ahmad',
        lastName: 'Hassan',
        dob: new Date('2014-05-10'),
        primaryParentId: additionalUsers[2].id
      }
    }),
    prisma.student.create({
      data: {
        orgId: org3.id,
        firstName: 'Zainab',
        lastName: 'Ahmed',
        dob: new Date('2013-12-03'),
        primaryParentId: users[3].id // Aisha Patel
      }
    })
  ])

  // Create classes for additional orgs
  await Promise.all([
    prisma.class.create({
      data: {
        orgId: org2.id,
        name: 'Arabic Language Class',
        description: 'Basic Arabic reading and writing',
        teacherId: additionalUsers[1].id,
        schedule: JSON.stringify({
          days: ['monday', 'wednesday', 'friday'],
          startTime: '16:00',
          endTime: '17:30'
        })
      }
    }),
    prisma.class.create({
      data: {
        orgId: org3.id,
        name: 'Quran Memorization',
        description: 'Advanced Quran memorization techniques',
        teacherId: users[2].id, // Omar Khan
        schedule: JSON.stringify({
          days: ['tuesday', 'thursday', 'saturday'],
          startTime: '18:00',
          endTime: '19:30'
        })
      }
    })
  ])

  // Create platform billing for additional orgs
  await Promise.all([
    prisma.platformOrgBilling.create({
      data: {
        orgId: org2.id,
        stripeCustomerId: 'cus_demo_org2_' + Date.now(),
        stripeSubscriptionItemId: 'si_demo_org2_' + Date.now(),
        lastUsageReportedAt: new Date()
      }
    }),
    prisma.platformOrgBilling.create({
      data: {
        orgId: org3.id,
        stripeCustomerId: 'cus_demo_org3_' + Date.now(),
        stripeSubscriptionItemId: 'si_demo_org3_' + Date.now(),
        lastUsageReportedAt: new Date()
      }
    })
  ])

  // Create additional audit logs for platform activity
  await Promise.all([
    prisma.auditLog.create({
      data: {
        orgId: null, // Platform-level
        actorUserId: users[0].id, // Ahmed Hassan
        action: 'CREATE_ORG',
        targetType: 'Organization',
        targetId: org2.id,
        data: JSON.stringify({ orgName: org2.name })
      }
    }),
    prisma.auditLog.create({
      data: {
        orgId: null, // Platform-level
        actorUserId: users[0].id, // Ahmed Hassan
        action: 'CREATE_ORG',
        targetType: 'Organization',
        targetId: org3.id,
        data: JSON.stringify({ orgName: org3.name })
      }
    })
  ])

  console.log('🎉 Seed completed successfully!')
  console.log('\nDemo accounts:')
  console.log('👑 Owner: owner@demo.com (password: demo123)')
  console.log('👨‍💼 Admin: admin@demo.com (password: demo123)')
  console.log('👨‍🏫 Staff: staff@demo.com (password: demo123)')
  console.log('👨‍👩‍👧‍👦 Parent: parent@demo.com (password: demo123)')
  console.log('\nAdditional demo accounts:')
  console.log('👨‍💼 Admin 2: admin2@demo.com (password: demo123)')
  console.log('👨‍🏫 Teacher 2: teacher2@demo.com (password: demo123)')
  console.log('👨‍👩‍👧‍👦 Parent 2: parent2@demo.com (password: demo123)')
  console.log('\nOrganizations created:')
  console.log('🏢 Leicester Islamic Centre (3 students, 1 class)')
  console.log('🏢 Manchester Islamic School (1 student, 1 class)')
  console.log('🏢 Birmingham Quran Academy (1 student, 1 class)')
  console.log('\nAccess the app at: http://localhost:3000')
  console.log('Staff Portal: http://localhost:3000?portal=app')
  console.log('Parent Portal: http://localhost:3000?portal=parent')
  console.log('Owner Portal: http://localhost:3000?portal=app (login as owner@demo.com)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
