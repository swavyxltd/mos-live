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
      primaryParent: true,
      studentClasses: {
        include: {
          class: true
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

  // Transform student data for frontend
  const transformedStudents = students.map(student => {
    const age = student.dateOfBirth 
      ? Math.floor((new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email || '',
      phone: student.phone || '',
      dateOfBirth: student.dateOfBirth,
      age,
      grade: student.grade || '',
      parentName: student.primaryParent?.name || '',
      parentEmail: student.primaryParent?.email || '',
      parentPhone: student.primaryParent?.phone || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.enrollmentDate || student.createdAt,
      status: student.status || 'ACTIVE',
      isArchived: student.isArchived,
      archivedAt: student.archivedAt,
      orgId: student.orgId,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      classes: student.studentClasses.map(sc => ({
        id: sc.class.id,
        name: sc.class.name
      })),
      attendanceRate: 0, // TODO: Calculate from attendance records
      lastAttendance: new Date() // TODO: Get from attendance records
    }
  })

  return (
    <StudentsPageWrapper 
      initialStudents={transformedStudents} 
      classes={classes} 
    />
  )
}
