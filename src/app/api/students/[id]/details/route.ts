export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg, requireAuth } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

/**
 * Comprehensive student details endpoint
 * Fetches all student data needed for the view student modal:
 * - Basic info, classes, teachers
 * - Parents/guardians
 * - Attendance records and stats
 * - Payment records and fees
 * - Progress notes
 * - Activity log
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    // For super admins (owners), allow access without org requirement
    // For others, require org and role
    let orgId: string | null = null
    if (session.user.isSuperAdmin) {
      // Super admins can access any student - get orgId from student record
      // We'll fetch it below
    } else {
      const roleCheck = await requireRole(['ADMIN', 'OWNER', 'STAFF', 'PARENT'])(request)
      if (roleCheck instanceof NextResponse) return roleCheck
      
      const orgCheck = await requireOrg(request)
      if (orgCheck instanceof NextResponse) return orgCheck
      orgId = orgCheck
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Get orgId from student if not already set (for super admins)
    if (!orgId && student) {
      orgId = student.orgId
    }

    // If user is a parent, verify they own this student
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = orgId ? await getUserRoleInOrg(session.user.id, orgId) : null

    // Fetch student with all relations in one efficient query
    // For super admins, don't filter by orgId (they can see all students)
    // For others, filter by orgId
    const student = await prisma.student.findFirst({
      where: {
        id,
        ...(orgId ? { orgId } : {}) // Only filter by orgId if it's set
      },
      include: {
        // Primary parent
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            backupPhone: true
          }
        },
        // All classes with teachers
        StudentClass: {
          include: {
            Class: {
              include: {
                User: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        // Recent attendance records (last 14 days, limit to 20)
        Attendance: {
          where: {
            date: {
              gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
            }
          },
          include: {
            Class: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          take: 20
        },
        // Payment records (last 6 months, limit to 20)
        MonthlyPaymentRecord: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // Last 6 months
            }
          },
          include: {
            Class: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            month: 'desc'
          },
          take: 20
        },
        // Progress notes (limit to 20)
        ProgressLog: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        },
        // Invoices (last 6 months, limit to 20)
        Invoice: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify parent access (only if userRole is set and they're a parent)
    if (userRole === 'PARENT' && student.primaryParentId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only access your own children' },
        { status: 403 }
      )
    }

    // Calculate age
    const age = student.dob
      ? Math.floor((new Date().getTime() - new Date(student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    // Calculate attendance stats - use count queries for better performance
    const finalOrgId = orgId || student.orgId
    const [presentCount, absentCount, lateCount, totalCount] = await Promise.all([
      prisma.attendance.count({
        where: {
          studentId: id,
          orgId: finalOrgId,
          status: 'PRESENT'
        }
      }),
      prisma.attendance.count({
        where: {
          studentId: id,
          orgId: finalOrgId,
          status: 'ABSENT'
        }
      }),
      prisma.attendance.count({
        where: {
          studentId: id,
          orgId: finalOrgId,
          status: 'LATE'
        }
      }),
      prisma.attendance.count({
        where: {
          studentId: id,
          orgId: finalOrgId
        }
      })
    ])
    
    const presentAndLateCount = presentCount + lateCount
    const attendanceRate = totalCount > 0
      ? Math.round((presentAndLateCount / totalCount) * 100)
      : 0

    // Calculate fees stats - use aggregation for better performance
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    
    const [totalPaidThisYearResult, currentBalanceResult] = await Promise.all([
      prisma.monthlyPaymentRecord.aggregate({
        where: {
          studentId: id,
          orgId: finalOrgId,
          createdAt: { gte: yearStart },
          status: 'PAID'
        },
        _sum: {
          amountP: true
        }
      }),
      prisma.monthlyPaymentRecord.aggregate({
        where: {
          studentId: id,
          orgId: finalOrgId,
          status: { in: ['PENDING', 'OVERDUE'] }
        },
        _sum: {
          amountP: true
        }
      })
    ])
    
    const totalPaidThisYear = totalPaidThisYearResult._sum.amountP || 0
    const currentBalance = currentBalanceResult._sum.amountP || 0

    // Get activity log (recent audit logs for this student) - limit to 10
    const activityLog = await prisma.auditLog.findMany({
      where: {
        orgId: orgId || student.orgId,
        targetType: 'STUDENT',
        targetId: id
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Get all parents (if there are multiple ways to link parents, expand this)
    const parents = []
    if (student.User) {
      parents.push({
        id: student.User.id,
        name: student.User.name || '',
        email: student.User.email || '',
        phone: student.User.phone || '',
        backupPhone: student.User.backupPhone || '',
        isPrimary: true
      })
    }

    // Format classes with teachers
    const classes = student.StudentClass.map(sc => ({
      id: sc.Class.id,
      name: sc.Class.name,
      teacher: sc.Class.User ? {
        id: sc.Class.User.id,
        name: sc.Class.User.name || '',
        email: sc.Class.User.email || ''
      } : null
    }))

    // Format recent attendance
    const recentAttendance = student.Attendance.map(att => ({
      id: att.id,
      date: att.date.toISOString(),
      status: att.status,
      time: att.time || null,
      class: att.Class ? {
        id: att.Class.id,
        name: att.Class.name
      } : null
    }))

    // Format payment records
    const paymentRecords = student.MonthlyPaymentRecord.map(record => ({
      id: record.id,
      month: record.month,
      amountP: record.amountP,
      method: record.method || null,
      status: record.status,
      paidAt: record.paidAt ? record.paidAt.toISOString() : null,
      notes: record.notes || null,
      reference: record.reference || null,
      class: record.Class ? {
        id: record.Class.id,
        name: record.Class.name
      } : null,
      createdAt: record.createdAt.toISOString()
    }))

    // Format progress notes
    const notes = student.ProgressLog.map(note => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      author: note.User ? {
        id: note.User.id,
        name: note.User.name || '',
        email: note.User.email || ''
      } : null
    }))

    // Format invoices
    const invoices = student.Invoice.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || null,
      amountP: inv.amountP,
      currency: inv.currency || 'GBP',
      status: inv.status,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
      createdAt: inv.createdAt.toISOString()
    }))

    // Format activity log
    const activity = activityLog.map(log => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      data: log.data ? JSON.parse(log.data) : null,
      createdAt: log.createdAt.toISOString(),
      actor: log.User ? {
        id: log.User.id,
        name: log.User.name || '',
        email: log.User.email || ''
      } : null
    }))

    return NextResponse.json({
      // Basic info
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      name: `${student.firstName} ${student.lastName}`,
      dateOfBirth: student.dob ? student.dob.toISOString() : null,
      age,
      allergies: student.allergies || null,
      medicalNotes: student.medicalNotes || null,
      enrollmentDate: student.createdAt.toISOString(),
      status: student.isArchived ? 'ARCHIVED' : 'ACTIVE',
      isArchived: student.isArchived,
      archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
      studentId: student.id, // Reference ID

      // Classes and teachers
      classes,

      // Parents
      parents,

      // Attendance
      attendance: {
        overall: attendanceRate,
      stats: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: totalCount
      },
        recent: recentAttendance
      },

      // Fees (only if user has permission)
      fees: {
        currentBalance: currentBalance / 100, // Convert from pence to pounds
        totalPaidThisYear: totalPaidThisYear / 100,
        paymentRecords,
        invoices
      },

      // Notes
      notes,

      // Activity
      activity
    })
  } catch (error: any) {
    logger.error('Error fetching student details', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch student details',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

