export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const updateStatusSchema = z.object({
  userId: z.string(),
  status: z.enum(['YES', 'NO', 'NOT_SURE'])
})

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const body = await request.json()
    const { userId, status } = updateStatusSchema.parse(body)
    
    // Verify user is a parent in this org
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId
        }
      }
    })
    
    if (!membership || membership.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'User is not a parent in this organisation' },
        { status: 403 }
      )
    }
    
    // Update user's Gift Aid status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        giftAidStatus: status,
        giftAidDeclaredAt: new Date()
      }
    })
    
    // If updating to YES, ensure parent has payments (create if needed)
    if (status === 'YES') {
      // Check if parent has students
      const students = await prisma.student.findMany({
        where: {
          orgId,
          primaryParentId: userId,
          isArchived: false
        },
        take: 1
      })

      if (students.length === 0) {
        // Create a demo student for this parent
        const classItem = await prisma.class.findFirst({
          where: { orgId, isArchived: false }
        })

        if (classItem) {
          const studentId = `demo-student-${userId}`
          let student = await prisma.student.findUnique({
            where: { id: studentId }
          })

          if (!student) {
            student = await prisma.student.create({
              data: {
                id: studentId,
                orgId,
                firstName: updatedUser.name.split(' ')[0] || 'Student',
                lastName: updatedUser.name.split(' ').slice(1).join(' ') || 'Child',
                primaryParentId: userId,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })

            // Enroll student in class
            await prisma.studentClass.create({
              data: {
                id: `demo-studentclass-${student.id}-${classItem.id}`,
                orgId,
                studentId: student.id,
                classId: classItem.id
              }
            })
          }

          // Create invoices and payments for the last 3 months
          const now = new Date()
          for (let month = 1; month <= 3; month++) {
            const paymentDate = new Date(now)
            paymentDate.setMonth(paymentDate.getMonth() - month)
            paymentDate.setDate(15)

            const dueDate = new Date(paymentDate)
            dueDate.setDate(15)

            const amount = 50 // £50 default

            // Create invoice
            const invoiceId = `demo-invoice-${student.id}-${paymentDate.toISOString().split('T')[0]}`
            let invoice = await prisma.invoice.findUnique({
              where: { id: invoiceId }
            })

            if (!invoice) {
              invoice = await prisma.invoice.create({
                data: {
                  id: invoiceId,
                  orgId,
                  studentId: student.id,
                  amountP: Math.round(amount * 100),
                  dueDate,
                  status: 'PAID',
                  updatedAt: new Date()
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
                  orgId,
                  invoiceId: invoice.id,
                  method: 'STRIPE',
                  updatedAt: new Date()
                  amountP: Math.round(amount * 100),
                  status: 'SUCCEEDED',
                  createdAt: paymentDate,
                  updatedAt: paymentDate
                }
              })
            }
          }
        }
      } else {
        // Parent has students, check if they have payments
        const student = students[0]
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
          // Create invoices and payments for the last 3 months
          const now = new Date()
          for (let month = 1; month <= 3; month++) {
            const paymentDate = new Date(now)
            paymentDate.setMonth(paymentDate.getMonth() - month)
            paymentDate.setDate(15)

            const dueDate = new Date(paymentDate)
            dueDate.setDate(15)

            const amount = 50 // £50 default

            // Create invoice
            const invoiceId = `demo-invoice-${student.id}-${paymentDate.toISOString().split('T')[0]}`
            let invoice = await prisma.invoice.findUnique({
              where: { id: invoiceId }
            })

            if (!invoice) {
              invoice = await prisma.invoice.create({
                data: {
                  id: invoiceId,
                  orgId,
                  studentId: student.id,
                  amountP: Math.round(amount * 100),
                  dueDate,
                  status: 'PAID',
                  updatedAt: new Date()
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
                  orgId,
                  invoiceId: invoice.id,
                  method: 'STRIPE',
                  updatedAt: new Date()
                  amountP: Math.round(amount * 100),
                  status: 'SUCCEEDED',
                  createdAt: paymentDate,
                  updatedAt: paymentDate
                }
              })
            }
          }
        }
      }
    }
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        orgId,
        actorUserId: session.user.id,
        action: 'UPDATE_GIFT_AID_STATUS',
        targetType: 'User',
        targetId: userId,
        data: JSON.stringify({ status, parentName: updatedUser.name })
      }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        giftAidStatus: updatedUser.giftAidStatus
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    logger.error('Update gift aid status error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update Gift Aid status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

