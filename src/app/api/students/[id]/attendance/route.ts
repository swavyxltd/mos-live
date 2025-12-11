export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Verify user has appropriate role
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (!userRole || !['ADMIN', 'OWNER', 'STAFF', 'PARENT'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Verify student belongs to this org and get their classes
    const student = await prisma.student.findFirst({
      where: {
        id,
        orgId: org.id
      },
      select: {
        id: true,
        createdAt: true,
        StudentClass: {
          include: {
            Class: {
              select: {
                id: true,
                name: true,
                schedule: true
              }
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If user is a parent, verify they own this student
    if (userRole === 'PARENT' && student.primaryParentId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized - You can only access your own children' }, { status: 403 })
    }

    // Get class schedules - combine all classes the student is enrolled in
    const classSchedules: string[] = []
    student.StudentClass.forEach(sc => {
      try {
        const schedule = typeof sc.Class.schedule === 'string' 
          ? JSON.parse(sc.Class.schedule) 
          : sc.Class.schedule
        if (schedule?.days && Array.isArray(schedule.days)) {
          schedule.days.forEach((day: string) => {
            if (!classSchedules.includes(day)) {
              classSchedules.push(day)
            }
          })
        }
      } catch (e) {
        // Skip invalid schedules
      }
    })

    // Build date filter - always exclude future dates
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    const dateFilter: any = {
      lte: today // Always exclude future dates
    }
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      // Use the earlier of endDate or today
      const endDateObj = new Date(endDate)
      dateFilter.lte = endDateObj < today ? endDateObj : today
    }

    // Get attendance records - only up to today, scoped to org
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: id,
        orgId: org.id, // CRITICAL: Ensure org scoping
        date: dateFilter
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Transform to match expected format
    const attendanceData = attendanceRecords.map(record => ({
      date: record.date.toISOString(),
      status: record.status,
      time: record.time || undefined
    }))

    // Get enrollment date - use student creation date as enrollment date
    // (StudentClass doesn't have createdAt, so we use Student.createdAt)
    const enrollmentDate = student.createdAt

    return NextResponse.json({
      attendance: attendanceData,
      scheduledDays: classSchedules, // Return the scheduled days
      enrollmentDate: enrollmentDate.toISOString() // Return enrollment date
    })
  } catch (error: any) {
    logger.error('Error fetching student attendance', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

