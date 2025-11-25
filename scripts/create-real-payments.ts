import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const orgId = 'cmhisb4kl000064jrdmapjtiu' // Masjid Al Falah

async function createRealPayments() {
  try {
    // Check if class exists, if not create one
    let class_ = await prisma.class.findFirst({ 
      where: { orgId, isArchived: false } 
    })
    
    if (!class_) {
      class_ = await prisma.class.create({
        data: {
          orgId,
          name: 'Level 1 - Beginners',
          schedule: 'Monday, Wednesday, Friday 4:00 PM - 6:00 PM',
          monthlyFeeP: 3000 // £30.00
        }
      })
      console.log('✅ Created class:', class_.name, 'Fee: £30.00')
    }

    // Check if students exist, if not create some
    const students = await prisma.student.findMany({ 
      where: { orgId },
      take: 3
    })
    
    if (students.length === 0) {
      const studentNames = [
        { firstName: 'Muhammad', lastName: 'Ahmed' },
        { firstName: 'Amina', lastName: 'Hassan' },
        { firstName: 'Ibrahim', lastName: 'Ali' }
      ]
      
      for (const name of studentNames) {
        const student = await prisma.student.create({
          data: {
            orgId,
            firstName: name.firstName,
            lastName: name.lastName
          }
        })
        
        // Enroll student in class
        await prisma.studentClass.create({
          data: {
            orgId,
            studentId: student.id,
            classId: class_.id
          }
        })
        
        students.push(student)
        console.log('✅ Created student:', student.firstName, student.lastName)
      }
    }

    // Create payment records for each student
    const months = ['2025-09', '2025-10', '2025-11']
    const statuses = ['PAID', 'PENDING', 'LATE']
    const methods = ['CASH', 'BANK_TRANSFER', 'STRIPE']
    
    for (const student of students) {
      // Check if records already exist for this student
      const existingRecords = await prisma.monthlyPaymentRecord.findMany({
        where: {
          orgId,
          studentId: student.id,
          month: { in: months }
        }
      })
      
      if (existingRecords.length === 0) {
        // Create 3 payment records for this student (one for each month)
        for (let i = 0; i < months.length; i++) {
          await prisma.monthlyPaymentRecord.create({
            data: {
              orgId,
              studentId: student.id,
              classId: class_.id,
              month: months[i],
              amountP: class_.monthlyFeeP || 3000,
              method: methods[i],
              status: statuses[i],
              ...(statuses[i] === 'PAID' ? { paidAt: new Date() } : {})
            }
          })
        }
        console.log(`✅ Created 3 payment records for ${student.firstName} ${student.lastName}`)
      }
    }
    
    const totalRecords = await prisma.monthlyPaymentRecord.count({ where: { orgId } })
    console.log(`\n✅ Total payment records for Masjid Al Falah: ${totalRecords}`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createRealPayments()

