export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Check payment method
    const hasPaymentMethod = await checkPaymentMethod()
    if (!hasPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method required. Please set up a payment method to create classes.' },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { name, description, schedule, teacherId, monthlyFeeP } = body

    if (!name || !schedule) {
      return NextResponse.json(
        { error: 'Name and schedule are required' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const { sanitizeText, MAX_STRING_LENGTHS } = await import('@/lib/input-validation')
    const sanitizedName = sanitizeText(name, MAX_STRING_LENGTHS.name)
    const sanitizedDescription = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null
    const sanitizedSchedule = sanitizeText(schedule, MAX_STRING_LENGTHS.text)

    if (monthlyFeeP === undefined || monthlyFeeP < 0) {
      return NextResponse.json(
        { error: 'Monthly fee must be provided and non-negative' },
        { status: 400 }
      )
    }

    const classRecord = await prisma.class.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        name: sanitizedName,
        description: sanitizedDescription,
        schedule: sanitizedSchedule,
        teacherId: teacherId || null,
        monthlyFeeP: Math.round(monthlyFeeP), // Already in pence from frontend
        updatedAt: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(classRecord, { status: 201 })
  } catch (error: any) {
    logger.error('Create class error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create class',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

async function handleGET(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
  if (session instanceof NextResponse) {
    return session
  }
  
  const orgId = await requireOrg(request)
  if (orgId instanceof NextResponse) {
    return orgId
  }

  // Check if user is a teacher - if so, only show their assigned classes
  const { getUserRoleInOrg } = await import('@/lib/org')
  const userRole = await getUserRoleInOrg(session.user.id, orgId)
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: orgId
      }
    },
    select: {
      staffSubrole: true
    }
  })

  const isTeacher = membership?.staffSubrole === 'TEACHER' || (userRole === 'STAFF' && !membership?.staffSubrole)
  
  const classes = await prisma.class.findMany({
    where: { 
      orgId, 
      isArchived: false,
      // If user is a teacher, only show classes assigned to them
      ...(isTeacher && { teacherId: session.user.id })
    },
    select: {
      id: true,
      name: true,
      description: true,
      schedule: true,
      teacherId: true,
      monthlyFeeP: true,
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          StudentClass: {
            where: {
              Student: {
                isArchived: false
              }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  // Calculate actual attendance rates for each class
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0)
  
  const classesWithAttendance = await Promise.all(classes.map(async (cls) => {
    // Get attendance records for this class in the current week, scoped to org
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: cls.id,
        orgId: orgId, // CRITICAL: Ensure org scoping
        date: { gte: weekStart }
      },
      select: { status: true }
    })
    
    const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length
    const totalRecords = attendanceRecords.length
    const attendanceRate = totalRecords > 0
      ? Math.round((presentCount / totalRecords) * 100)
      : 0
    
    return {
      ...cls,
      attendance: attendanceRate
    }
  }))
  
  return NextResponse.json(classesWithAttendance)
}

export const GET = withRateLimit(handleGET)
