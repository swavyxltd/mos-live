import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { StudentsPageWrapper } from '@/components/students-page-wrapper'

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  // Check if user is a teacher - if so, only show students in their classes
  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: org.id
      }
    },
    select: {
      staffSubrole: true
    }
  })

  const isTeacher = membership?.staffSubrole === 'TEACHER' || (userRole === 'STAFF' && !membership?.staffSubrole)

  // Get teacher's class IDs if user is a teacher
  let teacherClassIds: string[] = []
  if (isTeacher) {
    const teacherClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        teacherId: session.user.id
      },
      select: {
        id: true
      }
    })
    teacherClassIds = teacherClasses.map(c => c.id)
    
    // If teacher has no classes, return empty students list
    if (teacherClassIds.length === 0) {
      return (
        <StudentsPageWrapper 
          initialStudents={[]} 
          classes={[]} 
        />
      )
    }
  }
  
  // Get students - filter by teacher's classes if user is a teacher
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      isArchived: false,
      ...(isTeacher && {
        StudentClass: {
          some: {
            classId: { in: teacherClassIds }
          }
        }
      })
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
  
  // Get classes - filter by teacher if user is a teacher
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false,
      ...(isTeacher && { teacherId: session.user.id })
    }
  })

  // Get YTD (Year to Date) attendance records for these students
  // Always exclude future dates
  const studentIds = students.map(s => s.id)
  const now = new Date()
  const today = new Date(now)
  today.setHours(23, 59, 59, 999)
  
  const yearStart = new Date(now.getFullYear(), 0, 1) // January 1st of current year
  yearStart.setHours(0, 0, 0, 0)
  
  const allAttendance = studentIds.length > 0 ? await prisma.attendance.findMany({
    where: {
      studentId: { in: studentIds },
      orgId: org.id,
      ...(isTeacher && teacherClassIds.length > 0 && {
        classId: { in: teacherClassIds }
      }),
      date: {
        gte: yearStart, // Only records from current year (YTD)
        lte: today // Exclude future dates
      }
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

  // Calculate YTD attendance rates per student
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
      parentName: student.User?.name || '',
      parentEmail: student.User?.email || '',
      parentPhone: student.User?.phone || '',
      address: '',
      backupPhone: '',
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
      lastAttendance: attendance.lastDate || student.createdAt,
      // Claim status field
      claimStatus: student.claimStatus || 'NOT_CLAIMED'
    }
  })

  // Sort students alphabetically by firstName, then lastName (A-Z)
  const sortedStudents = transformedStudents.sort((a, b) => {
    const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
    if (firstNameCompare !== 0) return firstNameCompare
    return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
  })

  return (
    <StudentsPageWrapper 
      initialStudents={sortedStudents} 
      classes={classes} 
    />
  )
}
