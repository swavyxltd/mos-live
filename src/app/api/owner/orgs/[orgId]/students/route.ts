import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/owner/orgs/[orgId]/students - Get all students for a specific org (owner only)
async function handleGET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId } = params

    // Verify org exists
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true, name: true }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Get all students for this org with attendance data
    const students = await prisma.student.findMany({
      where: {
        orgId,
        isArchived: false
      },
      include: {
        primaryParent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        StudentClass: {
          include: {
            Class: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            Attendance: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    // Calculate attendance rates
    const studentsWithAttendance = await Promise.all(
      students.map(async (student) => {
        const totalAttendance = await prisma.attendance.count({
          where: {
            studentId: student.id,
            orgId
          }
        })
        
        const presentAttendance = await prisma.attendance.count({
          where: {
            studentId: student.id,
            orgId,
            status: { in: ['PRESENT', 'LATE'] }
          }
        })

        const attendanceRate = totalAttendance > 0
          ? Math.round((presentAttendance / totalAttendance) * 100)
          : 0

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: '', // Students don't have emails
          phone: '', // Students don't have phones
          dob: student.dob,
          isArchived: student.isArchived,
          attendanceRate,
          parentName: student.primaryParent?.name || 'N/A',
          parentEmail: student.primaryParent?.email || '',
          parentPhone: student.primaryParent?.phone || '',
          createdAt: student.createdAt
        }
      })
    )

    return NextResponse.json(studentsWithAttendance)
  } catch (error: any) {
    logger.error('Error fetching org students', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch students',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

