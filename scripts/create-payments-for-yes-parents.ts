import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating payments for YES status parents who need them...')

  // Get the demo org
  const org = await prisma.org.findFirst({
    where: { name: 'Test Islamic School' }
  })

  if (!org) {
    console.error('Test Islamic School not found')
    process.exit(1)
  }

  // Get all YES status parents in this org
  const yesParents = await prisma.user.findMany({
    where: {
      UserOrgMembership: {
        some: {
          orgId: org.id,
          role: 'PARENT'
        }
      },
      giftAidStatus: 'YES'
    }
  })

  console.log(`Found ${yesParents.length} YES status parents`)

  const now = new Date()
  const amounts = [50, 100, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]

  for (let i = 0; i < yesParents.length; i++) {
    const parent = yesParents[i]
    
    // Check if parent has students
    const students = await prisma.student.findMany({
      where: {
        orgId: org.id,
        primaryParentId: parent.id,
        isArchived: false
      },
      take: 1
    })

    if (students.length === 0) {
      // Create a demo student for this parent
      const studentId = `demo-student-${parent.id}`
      const existingStudent = await prisma.student.findUnique({
        where: { id: studentId }
      })

      let student
      if (!existingStudent) {
        // Get a class to enroll the student in
        const classItem = await prisma.class.findFirst({
          where: { orgId: org.id, isArchived: false }
        })

        if (!classItem) {
          console.log(`⚠️  No classes found for org, skipping parent ${parent.name}`)
          continue
        }

        student = await prisma.student.create({
          data: {
            id: studentId,
            orgId: org.id,
            firstName: parent.name.split(' ')[0] || 'Student',
            lastName: parent.name.split(' ').slice(1).join(' ') || 'Child',
            primaryParentId: parent.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Enroll student in class
        await prisma.studentClass.create({
          data: {
            id: `demo-studentclass-${student.id}-${classItem.id}`,
            orgId: org.id,
            studentId: student.id,
            classId: classItem.id
          }
        })

        console.log(`✅ Created student for parent ${parent.name}`)
      } else {
        student = existingStudent
      }

      // Create invoices and payments for the last 3 months (past months)
      for (let month = 1; month <= 3; month++) {
        const paymentDate = new Date(now)
        paymentDate.setMonth(paymentDate.getMonth() - month)
        paymentDate.setDate(15) // Middle of the month

        const dueDate = new Date(paymentDate)
        dueDate.setDate(15) // Due on 15th

        const amount = amounts[i % amounts.length]

        // Create invoice
        const invoiceId = `demo-invoice-${student.id}-${paymentDate.toISOString().split('T')[0]}`
        let invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId }
        })

        if (!invoice) {
          invoice = await prisma.invoice.create({
            data: {
              id: invoiceId,
              orgId: org.id,
              studentId: student.id,
              amountP: Math.round(amount * 100),
              dueDate,
              status: 'PAID',
              paidAt: paymentDate,
              paidMethod: 'STRIPE',
              createdAt: paymentDate,
              updatedAt: paymentDate
            }
          })
        }

        // Create payment
        const paymentId = `demo-payment-${invoice.id}-${paymentDate.toISOString().split('T')[0]}`
        const existingPayment = await prisma.payment.findUnique({
          where: { id: paymentId }
        })

        if (!existingPayment) {
          await prisma.payment.create({
            data: {
              id: paymentId,
              orgId: org.id,
              invoiceId: invoice.id,
              method: 'STRIPE',
              amountP: Math.round(amount * 100),
              status: 'SUCCEEDED',
              createdAt: paymentDate,
              updatedAt: paymentDate
            }
          })
          console.log(`✅ Created payment for ${parent.name} - £${amount} - ${paymentDate.toISOString().split('T')[0]}`)
        }
      }
    } else {
      // Parent has students, create payments for existing students
      const student = students[0]
      
      // Check if student already has payments
      const existingPayments = await prisma.payment.findMany({
        where: {
          Invoice: {
            studentId: student.id
          },
          status: 'SUCCEEDED'
        },
        take: 1
      })

      if (existingPayments.length === 0) {
        // Create invoices and payments for the last 3 months (past months)
        for (let month = 1; month <= 3; month++) {
          const paymentDate = new Date(now)
          paymentDate.setMonth(paymentDate.getMonth() - month)
          paymentDate.setDate(15) // Middle of the month

          const dueDate = new Date(paymentDate)
          dueDate.setDate(15)

          const amount = amounts[i % amounts.length]

          // Create invoice
          const invoiceId = `demo-invoice-${student.id}-${paymentDate.toISOString().split('T')[0]}`
          let invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
          })

          if (!invoice) {
            invoice = await prisma.invoice.create({
              data: {
                id: invoiceId,
                orgId: org.id,
                studentId: student.id,
                amountP: Math.round(amount * 100),
                dueDate,
                status: 'PAID',
                paidAt: paymentDate,
                paidMethod: 'STRIPE',
                createdAt: paymentDate,
                updatedAt: paymentDate
              }
            })
          }

          // Create payment
          const paymentId = `demo-payment-${invoice.id}-${paymentDate.toISOString().split('T')[0]}`
          const existingPayment = await prisma.payment.findUnique({
            where: { id: paymentId }
          })

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                id: paymentId,
                orgId: org.id,
                invoiceId: invoice.id,
                method: 'STRIPE',
                amountP: Math.round(amount * 100),
                status: 'SUCCEEDED',
                createdAt: paymentDate,
                updatedAt: paymentDate
              }
            })
            console.log(`✅ Created payment for ${parent.name} (existing student) - £${amount} - ${paymentDate.toISOString().split('T')[0]}`)
          }
        }
      }
    }
  }

  console.log('\n✨ Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

