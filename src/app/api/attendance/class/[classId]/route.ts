export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> | { classId: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { classId } = resolvedParams

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    // Parse date string (YYYY-MM-DD) and create date range
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 })
    }
    
    // Create dates - start of day and start of next day
    // Use local timezone but normalize to start of day
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Fetch class with teacher and enrolled students
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        orgId: orgId,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        StudentClass: {
          select: {
            studentId: true,
            Student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isArchived: true,
              },
            },
          },
        },
      },
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Filter out archived students and get student IDs
    const validStudentClasses = classData.StudentClass.filter((sc) => sc.Student && !sc.Student.isArchived)
    const studentIds = validStudentClasses.map((sc) => sc.studentId)

    // If no students, return empty students array
    if (studentIds.length === 0) {
      return NextResponse.json({
        id: classData.id,
        name: classData.name,
        teacher: classData.User?.name || 'Unassigned',
        students: [],
      })
    }

    // Fetch attendance for all students in this class for the specific date
    // Only query if we have student IDs
    let attendanceRecords: any[] = []
    if (studentIds.length > 0) {
      try {
        attendanceRecords = await prisma.attendance.findMany({
          where: {
            classId: classId,
            studentId: { in: studentIds },
            date: {
              gte: targetDate,
              lt: nextDay,
            },
            orgId: orgId,
          },
          select: {
            studentId: true,
            status: true,
            createdAt: true, // Use createdAt for time if available
          },
        })
      } catch (attendanceError: any) {
        logger.error('Error fetching attendance records', {
          error: attendanceError?.message,
          classId,
          studentIds,
          targetDate,
          nextDay
        })
        // Continue with empty attendance records
        attendanceRecords = []
      }
    }

    // Map attendance records for quick lookup
    const attendanceMap = new Map(
      attendanceRecords.map((att) => [att.studentId, att])
    )

    const studentsWithStatus = validStudentClasses.map((sc) => {
      const student = sc.Student
      if (!student) {
        return null
      }
      const attendance = attendanceMap.get(student.id)
      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        status: attendance?.status || 'UNMARKED',
        time: attendance?.createdAt
          ? new Date(attendance.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : undefined,
      }
    }).filter((student): student is NonNullable<typeof student> => student !== null)

    return NextResponse.json({
      id: classData.id,
      name: classData.name,
      teacher: classData.User?.name || 'Unassigned',
      students: studentsWithStatus,
    })
  } catch (error: any) {
    logger.error('Error fetching class attendance', {
      error: error?.message,
      stack: error?.stack,
      classId,
      dateParam,
      orgId
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch attendance',
        ...(isDevelopment && { 
          details: error?.message,
          stack: error?.stack
        })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

