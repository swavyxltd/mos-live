export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

const bulkAttendanceSchema = z.object({
  classId: z.string(),
  date: z.string().transform(str => new Date(str)),
  attendance: z.array(z.object({
    studentId: z.string(),
    status: z.enum(['PRESENT', 'LATE', 'ABSENT'])
  }))
})

async function handlePOST(request: NextRequest) {
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
    
    // Normalize date to midnight to ensure consistent matching with unique constraint
    // Parse date string (YYYY-MM-DD) to avoid timezone issues
    let normalizedDate: Date
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse YYYY-MM-DD format directly to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number)
      normalizedDate = new Date(year, month - 1, day)
    } else {
      // Fallback for Date object
      const dateObj = new Date(date)
      const year = dateObj.getFullYear()
      const month = dateObj.getMonth()
      const day = dateObj.getDate()
      normalizedDate = new Date(year, month, day)
    }
    normalizedDate.setHours(0, 0, 0, 0)
    
    // Verify class belongs to org
    const classExists = await prisma.class.findFirst({
      where: { id: classId, orgId }
    })
    
    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
    
    // Verify all students belong to the class and org
    const studentIds = attendance.map(r => r.studentId)
    const studentsInClass = await prisma.studentClass.findMany({
      where: {
        classId,
        studentId: { in: studentIds },
        Student: {
          orgId,
          isArchived: false
        }
      },
      select: {
        studentId: true
      }
    })
    
    const validStudentIds = new Set(studentsInClass.map(s => s.studentId))
    const invalidStudents = attendance.filter(r => !validStudentIds.has(r.studentId))
    
    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { error: `Invalid students: ${invalidStudents.map(s => s.studentId).join(', ')}` },
        { status: 400 }
      )
    }
    
    // Bulk upsert attendance records
    const operations = attendance.map(record =>
      prisma.attendance.upsert({
        where: {
          classId_studentId_date: {
            classId,
            studentId: record.studentId,
            date: normalizedDate
          }
        },
        update: {
          status: record.status
        },
        create: {
          id: crypto.randomUUID(),
          orgId,
          classId,
          studentId: record.studentId,
          date: normalizedDate,
          status: record.status
        }
      })
    )
    
    await Promise.all(operations)
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        actorUserId: session.user.id,
        action: 'BULK_UPDATE_ATTENDANCE',
        targetType: 'Attendance',
        data: JSON.stringify({
          classId,
          date: normalizedDate.toISOString(),
          recordCount: attendance.length
        })
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Bulk attendance error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          ...(isDevelopment && { details: error.errors })
        },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          error: 'Duplicate attendance record',
          ...(isDevelopment && { details: error.message })
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update attendance',
        ...(isDevelopment && { details: error?.message, stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
