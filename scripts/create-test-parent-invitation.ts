import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function createTestInvitation() {
  try {
    // Get first org
    const org = await prisma.org.findFirst({
      where: { status: 'ACTIVE' }
    })

    if (!org) {
      console.error('No active organisation found')
      process.exit(1)
    }

    // Get or create a test student
    let student = await prisma.student.findFirst({
      where: { orgId: org.id, isArchived: false }
    })

    if (!student) {
      // Create a test student
      student = await prisma.student.create({
        data: {
          id: `student_${Date.now()}`,
          orgId: org.id,
          firstName: 'Test',
          lastName: 'Student',
          isArchived: false,
          updatedAt: new Date()
        }
      })
    }

    // Create a test class if needed
    let classRecord = await prisma.class.findFirst({
      where: { orgId: org.id }
    })

    if (!classRecord) {
      classRecord = await prisma.class.create({
        data: {
          id: `class_${Date.now()}`,
          orgId: org.id,
          name: 'Test Class',
          monthlyFeeP: 5000, // £50.00
          schedule: '{}',
          updatedAt: new Date()
        }
      })
    }

    // Enroll student in class if not enrolled
    const enrollment = await prisma.studentClass.findFirst({
      where: {
        studentId: student.id,
        classId: classRecord.id
      }
    })

    if (!enrollment) {
      await prisma.studentClass.create({
        data: {
          id: `sc_${Date.now()}`,
          orgId: org.id,
          studentId: student.id,
          classId: classRecord.id
        }
      })
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation
    const invitation = await prisma.parentInvitation.create({
      data: {
        id: `inv_${Date.now()}`,
        orgId: org.id,
        studentId: student.id,
        parentEmail: 'test@example.com',
        token,
        expiresAt
      }
    })

    console.log('\n✅ Test invitation created!')
    console.log(`\nToken: ${token}`)
    console.log(`\nURL: http://localhost:3000/auth/parent-setup?token=${token}`)
    console.log(`\nOrganisation: ${org.name}`)
    console.log(`Student: ${student.firstName} ${student.lastName}`)
    console.log(`Class: ${classRecord.name} (£${(classRecord.monthlyFeeP / 100).toFixed(2)}/month)`)
    console.log(`\nExpires: ${expiresAt.toLocaleString()}`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createTestInvitation()

