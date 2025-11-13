export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'

const bulkAttendanceSchema = z.object({
  classId: z.string(),
  date: z.string().transform(str => new Date(str)),
  attendance: z.array(z.object({
    studentId: z.string(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT'])
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'STAFF'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Check payment method
    const hasPaymentMethod = await checkPaymentMethod()
    if (!hasPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method required. Please set up a payment method to track attendance.' },
        { status: 402 }
      )
    }
    
    const body = await request.json()
    const { classId, date, attendance } = bulkAttendanceSchema.parse(body)
    
    // Verify class belongs to org
    const classExists = await prisma.class.findFirst({
      where: { id: classId, orgId }
    })
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
    
    // Bulk upsert attendance records
    const operations = attendance.map(record =>
      prisma.attendance.upsert({
        where: {
          classId_studentId_date: {
            classId,
            studentId: record.studentId,
            date
          }
        },
        update: {
          status: record.status
        },
        create: {
          orgId,
          classId,
          studentId: record.studentId,
          date,
          status: record.status
        }
      })
    )
    
    await Promise.all(operations)
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'BULK_UPDATE_ATTENDANCE',
        targetType: 'Attendance',
        data: {
          classId,
          date,
          recordCount: attendance.length
        }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bulk attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    )
  }
}
