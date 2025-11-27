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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Verify student belongs to this org and get their classes
    const student = await prisma.student.findFirst({
      where: {
        id,
        orgId: org.id
      },
      include: {
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

    // Get attendance records - only up to today
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: id,
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

    return NextResponse.json({
      attendance: attendanceData,
      scheduledDays: classSchedules // Return the scheduled days
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

