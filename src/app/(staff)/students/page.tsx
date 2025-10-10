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

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let students: any[] = []
  let classes: any[] = []

  if (isDemoMode()) {
    // Demo data for classes
    classes = [
      {
        id: 'demo-class-1',
        name: 'Quran Recitation - Level 1',
        grade: '1-3'
      },
      {
        id: 'demo-class-2',
        name: 'Islamic Studies - Level 2',
        grade: '4-6'
      },
      {
        id: 'demo-class-3',
        name: 'Arabic Grammar',
        grade: '2-4'
      },
      {
        id: 'demo-class-4',
        name: 'Memorization - Level 1',
        grade: '1-2'
      }
    ]

    // Enhanced demo data for students
    students = [
      {
        id: 'demo-student-1',
        firstName: 'Ahmed',
        lastName: 'Hassan',
        email: 'ahmed.hassan@example.com',
        phone: '+44 7700 900001',
        dateOfBirth: new Date('2015-03-15'),
        age: 9,
        grade: '3',
        parentName: 'Mohammed Hassan',
        parentEmail: 'mohammed.hassan@example.com',
        parentPhone: '+44 7700 900002',
        address: '123 Main Street, Leicester',
        emergencyContact: 'Fatima Hassan (+44 7700 900003)',
        allergies: 'None',
        medicalNotes: 'No known allergies or medical conditions',
        enrollmentDate: new Date('2024-09-01'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-1', name: 'Quran Recitation - Level 1' },
          { id: 'demo-class-3', name: 'Arabic Grammar' }
        ],
        attendanceRate: 95,
        lastAttendance: new Date('2024-12-05')
      },
      {
        id: 'demo-student-2',
        firstName: 'Fatima',
        lastName: 'Ali',
        email: 'fatima.ali@example.com',
        phone: '+44 7700 900004',
        dateOfBirth: new Date('2014-07-22'),
        age: 10,
        grade: '4',
        parentName: 'Aisha Ali',
        parentEmail: 'aisha.ali@example.com',
        parentPhone: '+44 7700 900005',
        address: '456 Oak Avenue, Leicester',
        emergencyContact: 'Hassan Ali (+44 7700 900006)',
        allergies: 'Peanuts, Tree nuts',
        medicalNotes: 'Asthma - inhaler required. Severe nut allergies - epipen available',
        enrollmentDate: new Date('2024-09-01'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-2', name: 'Islamic Studies - Level 2' },
          { id: 'demo-class-3', name: 'Arabic Grammar' }
        ],
        attendanceRate: 88,
        lastAttendance: new Date('2024-12-04')
      },
      {
        id: 'demo-student-3',
        firstName: 'Yusuf',
        lastName: 'Patel',
        email: 'yusuf.patel@example.com',
        phone: '+44 7700 900007',
        dateOfBirth: new Date('2016-11-08'),
        age: 8,
        grade: '2',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@example.com',
        parentPhone: '+44 7700 900008',
        address: '789 Elm Street, Leicester',
        emergencyContact: 'Raj Patel (+44 7700 900009)',
        allergies: 'None',
        medicalNotes: 'No known allergies or medical conditions',
        enrollmentDate: new Date('2024-09-15'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-09-15'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-1', name: 'Quran Recitation - Level 1' },
          { id: 'demo-class-4', name: 'Memorization - Level 1' }
        ],
        attendanceRate: 92,
        lastAttendance: new Date('2024-12-05')
      },
      {
        id: 'demo-student-4',
        firstName: 'Mariam',
        lastName: 'Ahmed',
        email: 'mariam.ahmed@example.com',
        phone: '+44 7700 900010',
        dateOfBirth: new Date('2013-05-12'),
        age: 11,
        grade: '5',
        parentName: 'Ahmed Mohammed',
        parentEmail: 'ahmed.mohammed@example.com',
        parentPhone: '+44 7700 900011',
        address: '321 Pine Street, Leicester',
        emergencyContact: 'Fatima Mohammed (+44 7700 900012)',
        allergies: 'Dairy',
        medicalNotes: 'Lactose intolerant - dairy-free meals required',
        enrollmentDate: new Date('2024-08-20'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-08-20'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-2', name: 'Islamic Studies - Level 2' }
        ],
        attendanceRate: 100,
        lastAttendance: new Date('2024-12-05')
      },
      {
        id: 'demo-student-5',
        firstName: 'Hassan',
        lastName: 'Khan',
        email: 'hassan.khan@example.com',
        phone: '+44 7700 900013',
        dateOfBirth: new Date('2017-09-03'),
        age: 7,
        grade: '1',
        parentName: 'Omar Khan',
        parentEmail: 'omar.khan@example.com',
        parentPhone: '+44 7700 900014',
        address: '654 Cedar Lane, Leicester',
        emergencyContact: 'Aisha Khan (+44 7700 900015)',
        allergies: 'None',
        medicalNotes: 'No known allergies or medical conditions',
        enrollmentDate: new Date('2024-10-01'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-1', name: 'Quran Recitation - Level 1' },
          { id: 'demo-class-4', name: 'Memorization - Level 1' }
        ],
        attendanceRate: 85,
        lastAttendance: new Date('2024-12-03')
      },
      {
        id: 'demo-student-6',
        firstName: 'Aisha',
        lastName: 'Rahman',
        email: 'aisha.rahman@example.com',
        phone: '+44 7700 900016',
        dateOfBirth: new Date('2015-12-18'),
        age: 9,
        grade: '3',
        parentName: 'Abdul Rahman',
        parentEmail: 'abdul.rahman@example.com',
        parentPhone: '+44 7700 900017',
        address: '987 Maple Drive, Leicester',
        emergencyContact: 'Fatima Rahman (+44 7700 900018)',
        allergies: 'Shellfish',
        medicalNotes: 'Shellfish allergy - avoid seafood',
        enrollmentDate: new Date('2024-11-01'),
        status: 'ACTIVE',
        isArchived: false,
        orgId: org.id,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'demo-class-1', name: 'Quran Recitation - Level 1' },
          { id: 'demo-class-3', name: 'Arabic Grammar' }
        ],
        attendanceRate: 90,
        lastAttendance: new Date('2024-12-05')
      }
    ]
  } else {
    // Get students and classes from database (excluding archived)
    const { prisma } = await import('@/lib/prisma')
    
    students = await prisma.student.findMany({
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
    
    classes = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false
      }
    })
  }

  return (
    <StudentsPageWrapper 
      initialStudents={students} 
      classes={classes} 
    />
  )
}
