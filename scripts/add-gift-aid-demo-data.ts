import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Gift Aid demo data to database...')

  // Find the test org where test accounts are - prioritize Test Islamic School
  let org = await prisma.org.findFirst({
    where: {
      name: 'Test Islamic School'
    }
  })
  
  if (!org) {
    // Try to find any org with test accounts
    org = await prisma.org.findFirst({
      where: {
        UserOrgMembership: {
          some: {
            User: {
              email: { in: ['admin@test.com', 'staff@test.com', 'parent@test.com'] }
            }
          }
        }
      }
    })
  }
  
  if (!org) {
    console.error('Test Islamic School not found. Please run npm run create:accounts first.')
    process.exit(1)
  }

  console.log(`Using org: ${org.name} (${org.id})`)

  // Create demo parent users with different Gift Aid statuses - ALL with Muslim names and complete details
  const demoParents = [
    // YES status parents (for Active tab) - Complete Gift Aid details
    { name: 'Ahmed Hassan', email: 'parent1@test.com', phone: '07123456789', address: '10A High Street, Manchester', postcode: 'M1 1AA', title: 'Mr', giftAidStatus: 'YES' },
    { name: 'Fatima Ali', email: 'parent2@test.com', phone: '07234567890', address: '11B High Street, Birmingham', postcode: 'B5 2BB', title: 'Mrs', giftAidStatus: 'YES' },
    { name: 'Mohammed Khan', email: 'parent3@test.com', phone: '07345678901', address: '12C High Street, Liverpool', postcode: 'L3 3CC', title: 'Mr', giftAidStatus: 'YES' },
    { name: 'Aisha Ahmed', email: 'parent4@test.com', phone: '07456789012', address: '13D High Street, Sheffield', postcode: 'S4 4DD', title: 'Mrs', giftAidStatus: 'YES' },
    { name: 'Omar Malik', email: 'parent5@test.com', phone: '07567890123', address: '14E High Street, London', postcode: 'E5 5EE', title: 'Mr', giftAidStatus: 'YES' },
    { name: 'Zainab Ibrahim', email: 'parent6@test.com', phone: '07678901234', address: '15F High Street, London', postcode: 'N6 6FF', title: 'Miss', giftAidStatus: 'YES' },
    { name: 'Yusuf Hussain', email: 'parent7@test.com', phone: '07789012345', address: '16G High Street, London', postcode: 'W7 7GG', title: 'Mr', giftAidStatus: 'YES' },
    { name: 'Maryam Rahman', email: 'parent8@test.com', phone: '07890123456', address: '17H High Street, London', postcode: 'SW8 8HH', title: 'Mrs', giftAidStatus: 'YES' },
    { name: 'Ibrahim Shah', email: 'parent9@test.com', phone: '07901234567', address: '18I High Street, London', postcode: 'NW9 9II', title: 'Mr', giftAidStatus: 'YES' },
    { name: 'Amina Syed', email: 'parent10@test.com', phone: '07012345678', address: '19J High Street, London', postcode: 'SE10 0JJ', title: 'Ms', giftAidStatus: 'YES' },
    
    // NOT_SURE status parents (for Pending tab) - Complete details
    { name: 'Khadija Patel', email: 'parent11@test.com', phone: '07123456790', address: '45 Oak Avenue, Manchester', postcode: 'M1 2AB', title: 'Mrs', giftAidStatus: 'NOT_SURE' },
    { name: 'Hassan Qureshi', email: 'parent12@test.com', phone: '07234567891', address: '12 Elm Street, Birmingham', postcode: 'B5 3CD', title: 'Mr', giftAidStatus: 'NOT_SURE' },
    { name: 'Layla Sheikh', email: 'parent13@test.com', phone: '07345678902', address: '78 Maple Road, Liverpool', postcode: 'L3 4EF', title: 'Ms', giftAidStatus: 'NOT_SURE' },
    { name: 'Tariq Farooq', email: 'parent14@test.com', phone: '07456789013', address: '23 Pine Close, Sheffield', postcode: 'S4 5GH', title: 'Mr', giftAidStatus: 'NOT_SURE' },
    { name: 'Noor Aziz', email: 'parent15@test.com', phone: '07567890124', address: '56 Cedar Way, London', postcode: 'E5 6IJ', title: 'Miss', giftAidStatus: 'NOT_SURE' },
    
    // NO status parents (for Declined tab) - Complete details
    { name: 'Bilal Nasser', email: 'parent16@test.com', phone: '07678901235', address: '89 Birch Lane, London', postcode: 'N7 7KL', title: 'Mr', giftAidStatus: 'NO' },
    { name: 'Sana Khalil', email: 'parent17@test.com', phone: '07789012346', address: '34 Willow Drive, London', postcode: 'SW9 8MN', title: 'Mrs', giftAidStatus: 'NO' },
    { name: 'Hamza Rashid', email: 'parent18@test.com', phone: '07890123457', address: '67 Ash Grove, London', postcode: 'NW10 9OP', title: 'Mr', giftAidStatus: 'NO' },
    { name: 'Hafsa Mahmood', email: 'parent19@test.com', phone: '07901234568', address: '12 Beech Road, London', postcode: 'SE11 0QR', title: 'Ms', giftAidStatus: 'NO' },
    { name: 'Zakariya Ansari', email: 'parent20@test.com', phone: '07012345679', address: '45 Chestnut Avenue, London', postcode: 'W12 1ST', title: 'Mr', giftAidStatus: 'NO' }
  ]

  const hashedPassword = await bcrypt.hash('demo123', 12)
  const createdParents: any[] = []

  for (const parentData of demoParents) {
    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: parentData.email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `demo-parent-${parentData.email.split('@')[0]}`,
          email: parentData.email,
          name: parentData.name,
          phone: parentData.phone,
          address: parentData.address,
          postcode: parentData.postcode,
          title: parentData.title,
          giftAidStatus: parentData.giftAidStatus,
          giftAidDeclaredAt: new Date(),
          password: hashedPassword,
          updatedAt: new Date()
        }
      })
      console.log(`Created parent: ${parentData.name}`)
    } else {
      // Update existing user with Gift Aid data
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: parentData.name,
          phone: parentData.phone,
          address: parentData.address,
          postcode: parentData.postcode,
          title: parentData.title,
          giftAidStatus: parentData.giftAidStatus,
          giftAidDeclaredAt: new Date()
        }
      })
      console.log(`Updated parent: ${parentData.name}`)
    }

    // Ensure parent has membership in org
    const existingMembership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: org.id
        }
      }
    })

    if (!existingMembership) {
      await prisma.userOrgMembership.create({
        data: {
          id: `demo-membership-${user.id}-${org.id}`,
          userId: user.id,
          orgId: org.id,
          role: 'PARENT'
        }
      })
    }

    createdParents.push(user)
  }

  // Create demo students for YES status parents (so we can create payments)
  // First, get all YES status parents in this org (including existing ones)
  const allYesParents = await prisma.user.findMany({
    where: {
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: 'PARENT'
        }
      },
      giftAidStatus: 'YES'
    },
    take: 20 // Limit to 20 parents
  })
  
  const yesStatusParents = allYesParents.length > 0 ? allYesParents : createdParents.filter((_, i) => i < 10)
  const amounts = [25.00, 30.00, 50.00, 40.00, 35.00, 45.00, 60.00, 55.00, 42.50, 38.00]
  const now = new Date()

  for (let i = 0; i < yesStatusParents.length; i++) {
    const parent = yesStatusParents[i]
    
    // Check if student already exists for this parent
    let student = await prisma.student.findFirst({
      where: {
        orgId: org.id,
        primaryParentId: parent.id
      }
    })

    if (!student) {
      // Try to find an unlinked student in this org
      student = await prisma.student.findFirst({
        where: {
          orgId: org.id,
          primaryParentId: null,
          isArchived: false
        }
      })
      
      if (student) {
        // Link this student to the parent
        await prisma.student.update({
          where: { id: student.id },
          data: { primaryParentId: parent.id }
        })
        console.log(`Linked existing student ${student.firstName} ${student.lastName} to parent ${parent.name}`)
      } else {
        // Create a new student
        const nameParts = parent.name!.split(' ')
        const existingStudent = await prisma.student.findUnique({
          where: { id: `demo-student-${parent.id}` }
        })
        
        if (!existingStudent) {
          student = await prisma.student.create({
            data: {
              id: `demo-student-${parent.id}`,
              orgId: org.id,
              primaryParentId: parent.id,
              firstName: nameParts[0] || 'Student',
              lastName: nameParts.slice(1).join(' ') || 'Demo',
              updatedAt: new Date()
            }
          })
        } else {
          student = existingStudent
        }
      }
    }
    
    if (!student) {
      console.log(`Skipping parent ${parent.name} - no student available`)
      continue
    }

    // Create demo payments for the last 6 months
    for (let month = 0; month < 6; month++) {
      const paymentDate = new Date(now)
      paymentDate.setMonth(paymentDate.getMonth() - month)
      paymentDate.setDate(1) // First of the month

      // Check if invoice already exists
      let invoice = await prisma.invoice.findFirst({
        where: {
          orgId: org.id,
          studentId: student.id,
          dueDate: paymentDate
        }
      })

      if (!invoice) {
        const invoiceId = `demo-invoice-${student.id}-${paymentDate.toISOString().split('T')[0]}`
        // Check if invoice with this ID already exists
        const existingInvoice = await prisma.invoice.findUnique({
          where: { id: invoiceId }
        })
        
        if (!existingInvoice) {
          invoice = await prisma.invoice.create({
            data: {
              id: invoiceId,
              orgId: org.id,
              studentId: student.id,
              amountP: Math.round(amounts[i] * 100), // Convert to pence
              dueDate: paymentDate,
              status: 'PAID',
              paidAt: paymentDate,
              updatedAt: new Date()
            }
          })
        } else {
          invoice = existingInvoice
        }
      }

      // Check if payment already exists
      const existingPayment = await prisma.payment.findFirst({
        where: {
          orgId: org.id,
          invoiceId: invoice.id,
          createdAt: {
            gte: new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1),
            lt: new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1)
          }
        }
      })

      if (!existingPayment) {
        const paymentId = `demo-payment-${invoice.id}-${paymentDate.toISOString().split('T')[0]}`
        // Check if payment with this ID already exists
        const existingPaymentById = await prisma.payment.findUnique({
          where: { id: paymentId }
        })
        
        if (!existingPaymentById) {
          await prisma.payment.create({
            data: {
              id: paymentId,
              orgId: org.id,
              invoiceId: invoice.id,
              method: 'STRIPE',
              amountP: Math.round(amounts[i] * 100),
              status: 'SUCCEEDED',
              createdAt: paymentDate,
              updatedAt: paymentDate
            }
          })
        }
      }
    }
  }

  console.log('Created demo payments for YES status parents')

  // Create demo Gift Aid submission history
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@test.com' }
  })

  if (adminUser) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const demoSubmissions = [
      {
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 1, 0),
        totalAmount: 1250.00,
        totalCount: 25,
        filename: `Gift Aid ${monthNames[now.getMonth() - 2]} ${now.getFullYear()}.csv`,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 4, 0),
        totalAmount: 980.50,
        totalCount: 18,
        filename: `Gift Aid ${monthNames[now.getMonth() - 5]} ${now.getFullYear()}.csv`,
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      },
      {
        startDate: new Date(now.getFullYear(), now.getMonth() - 9, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 7, 0),
        totalAmount: 1520.75,
        totalCount: 32,
        filename: `Gift Aid ${monthNames[now.getMonth() - 8]} ${now.getFullYear()}.csv`,
        createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      },
      {
        startDate: new Date(now.getFullYear(), now.getMonth() - 12, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() - 10, 0),
        totalAmount: 875.25,
        totalCount: 15,
        filename: `Gift Aid ${monthNames[now.getMonth() - 11]} ${now.getFullYear()}.csv`,
        createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)
      },
      {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 2, 31),
        totalAmount: 2100.00,
        totalCount: 42,
        filename: `Gift Aid Mar ${now.getFullYear() - 1}.csv`,
        createdAt: new Date(now.getFullYear() - 1, 3, 15)
      }
    ]

    for (const submission of demoSubmissions) {
      const existing = await prisma.giftAidSubmission.findFirst({
        where: {
          orgId: org.id,
          filename: submission.filename
        }
      })

      if (!existing) {
        await prisma.giftAidSubmission.create({
          data: {
            orgId: org.id,
            generatedById: adminUser.id,
            startDate: submission.startDate,
            endDate: submission.endDate,
            totalAmount: submission.totalAmount,
            totalCount: submission.totalCount,
            filename: submission.filename,
            createdAt: submission.createdAt
          }
        })
      }
    }

    console.log('Created demo Gift Aid submission history')
  }

  console.log('✅ Gift Aid demo data added successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

