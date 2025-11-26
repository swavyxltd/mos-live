import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ParentChildrenPageClient } from '@/components/parent-children-page-client'

export default async function ParentChildrenPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg(session?.user?.id)
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Get parent's students with all related data
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      primaryParentId: session.user.id,
      isArchived: false
    },
    include: {
      StudentClass: {
        include: {
          Class: {
            include: {
              User: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Get attendance data for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      orgId: org.id,
      Student: {
        primaryParentId: session.user.id,
        isArchived: false
      },
      date: {
        gte: thirtyDaysAgo
      }
    },
    include: {
      Student: true
    }
  })

  // Get pending invoices for payment status
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      orgId: org.id,
      Student: {
        primaryParentId: session.user.id,
        isArchived: false
      },
      status: {
        in: ['PENDING', 'OVERDUE']
      }
    },
    include: {
      Student: true
    }
  })

  // Transform students data with comprehensive information
  const studentsData = students.map(student => {
    const primaryClass = student.StudentClass[0]?.Class || null
    const teacherName = primaryClass?.User?.name || 'N/A'
    const age = student.dob 
      ? Math.floor((new Date().getTime() - new Date(student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    // Calculate attendance stats
    const studentAttendance = attendanceRecords.filter(a => a.studentId === student.id)
    const totalDays = studentAttendance.length
    const presentDays = studentAttendance.filter(a => 
      a.status === 'PRESENT' || a.status === 'LATE'
    ).length
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

    // Get payment status
    const studentInvoices = pendingInvoices.filter(inv => inv.studentId === student.id)
    const totalOutstanding = studentInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const hasOverdue = studentInvoices.some(inv => inv.status === 'OVERDUE')

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      name: `${student.firstName} ${student.lastName}`,
      dateOfBirth: student.dob ? student.dob.toISOString().split('T')[0] : '',
      age,
      grade: student.grade || 'N/A',
      address: student.address || '',
      class: primaryClass?.name || 'N/A',
      teacher: teacherName,
      parentName: session.user.name || '',
      parentEmail: session.user.email || '',
      parentPhone: session.user.phone || '',
      emergencyContact: student.emergencyContact || '',
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.createdAt.toISOString(),
      status: 'ACTIVE',
      isArchived: student.isArchived,
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name,
        teacher: sc.Class.User?.name || 'N/A'
      })),
      attendanceRate,
      totalAttendanceDays: totalDays,
      presentDays,
      totalOutstanding,
      hasOverdue
    }
  })

  return <ParentChildrenPageClient students={studentsData} />
}

