import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get student stats
    const totalStudents = await prisma.student.count({
      where: { isArchived: false }
    })

    const activeStudents = await prisma.student.count({
      where: { isArchived: false }
    })

    const newStudentsThisMonth = await prisma.student.count({
      where: {
        createdAt: { gte: thisMonth },
        isArchived: false
      }
    })

    const studentsWithAllergies = await prisma.student.count({
      where: {
        isArchived: false,
        allergies: { not: null },
        NOT: { allergies: 'None' }
      }
    })

    const archivedStudents = await prisma.student.count({
      where: { isArchived: true }
    })

    // Get all students with their details
    const students = await prisma.student.findMany({
      where: { isArchived: false },
      include: {
        org: { select: { name: true } },
        primaryParent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate attendance rates for each student
    let allAttendance: any[] = []
    if (students.length > 0) {
      allAttendance = await prisma.attendance.findMany({
        where: {
          studentId: { in: students.map(s => s.id) }
        },
        select: {
          studentId: true,
          status: true
        }
      })
    }

    // Group attendance by student
    const attendanceByStudent = new Map<string, { present: number; total: number }>()
    allAttendance.forEach(att => {
      const entry = attendanceByStudent.get(att.studentId) || { present: 0, total: 0 }
      entry.total++
      if (att.status === 'PRESENT' || att.status === 'LATE') {
        entry.present++
      }
      attendanceByStudent.set(att.studentId, entry)
    })

    const allStudents = students.map(student => {
      const attendance = attendanceByStudent.get(student.id) || { present: 0, total: 0 }
      const attendanceRate = attendance.total > 0 
        ? Math.round((attendance.present / attendance.total) * 100) 
        : 0

      // Calculate age
      const age = student.dob 
        ? Math.floor((new Date().getTime() - new Date(student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : 0

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: '', // Students don't have email in schema
        phone: '', // Students don't have phone in schema
        dateOfBirth: student.dob ? student.dob.toISOString().split('T')[0] : null,
        age,
        grade: '', // Grade not in schema
        parentName: student.primaryParent?.name || '',
        parentEmail: student.primaryParent?.email || '',
        parentPhone: student.primaryParent?.phone || '',
        address: '', // Address not in schema
        emergencyContact: '', // Emergency contact not in schema
        allergies: student.allergies || 'None',
        medicalNotes: student.medicalNotes || '',
        enrollmentDate: student.createdAt.toISOString().split('T')[0],
        status: student.isArchived ? 'INACTIVE' : 'ACTIVE',
        isArchived: student.isArchived,
        archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
        orgId: student.orgId,
        orgName: student.org?.name || 'Unknown',
        createdAt: student.createdAt.toISOString(),
        updatedAt: student.updatedAt.toISOString(),
        classes: (student.studentClasses || []).map((sc: any) => ({
          id: sc.class?.id || '',
          name: sc.class?.name || ''
        })),
        attendanceRate,
        lastAttendance: new Date().toISOString() // TODO: Get actual last attendance date
      }
    })

    // Get organization distribution
    let topOrgsByStudents: any[] = []
    try {
      const orgDistribution = await prisma.org.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: {
              students: { where: { isArchived: false } }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })

      // Sort by student count manually to avoid Prisma ordering issues
      const sortedOrgs = orgDistribution.sort((a, b) => 
        (b._count.students || 0) - (a._count.students || 0)
      ).slice(0, 5)

      topOrgsByStudents = sortedOrgs.map(org => ({
        orgName: org.name,
        studentCount: org._count.students || 0,
        activeStudents: org._count.students || 0
      }))
    } catch (error: any) {
      logger.error('Error fetching org distribution', error)
      topOrgsByStudents = []
    }

    return NextResponse.json({
      stats: {
        totalStudents,
        activeStudents,
        newStudentsThisMonth,
        studentsWithAllergies,
        archivedStudents
      },
      allStudents,
      topOrgsByStudents
    })
  } catch (error: any) {
    logger.error('Error fetching student stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch student stats',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

