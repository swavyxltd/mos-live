import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { StudentsPageWrapper } from '@/components/students-page-wrapper'

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  // Get students and classes from database (excluding archived)
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    include: {
      User: true,
      StudentClass: {
        include: {
          Class: true
        }
      }
    }
  })
  
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    }
  })

  // Get all attendance records for these students
  const studentIds = students.map(s => s.id)
  const allAttendance = studentIds.length > 0 ? await prisma.attendance.findMany({
    where: {
      studentId: { in: studentIds },
      orgId: org.id
    },
    select: {
      studentId: true,
      status: true,
      date: true
    },
    orderBy: {
      date: 'desc'
    }
  }) : []

  // Calculate attendance rates per student
  const attendanceByStudent = new Map<string, { present: number; total: number; lastDate: Date | null }>()
  allAttendance.forEach(att => {
    const entry = attendanceByStudent.get(att.studentId) || { present: 0, total: 0, lastDate: null }
    entry.total++
    if (att.status === 'PRESENT' || att.status === 'LATE') {
      entry.present++
    }
    if (!entry.lastDate || att.date > entry.lastDate) {
      entry.lastDate = att.date
    }
    attendanceByStudent.set(att.studentId, entry)
  })

  // Transform student data for frontend
  const transformedStudents = students.map(student => {
    const age = student.dob 
      ? Math.floor((new Date().getTime() - new Date(student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    const attendance = attendanceByStudent.get(student.id) || { present: 0, total: 0, lastDate: null }
    const attendanceRate = attendance.total > 0
      ? Math.round((attendance.present / attendance.total) * 100)
      : 0

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: '',
      phone: '',
      dateOfBirth: student.dob,
      age,
      grade: '',
      parentName: student.User?.name || '',
      parentEmail: student.User?.email || '',
      parentPhone: student.User?.phone || '',
      address: '',
      emergencyContact: '',
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.createdAt,
      status: 'ACTIVE',
      isArchived: student.isArchived,
      archivedAt: student.archivedAt,
      orgId: student.orgId,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      })),
      attendanceRate,
      lastAttendance: attendance.lastDate || student.createdAt
    }
  })

  return (
    <StudentsPageWrapper 
      initialStudents={transformedStudents} 
      classes={classes} 
    />
  )
}
