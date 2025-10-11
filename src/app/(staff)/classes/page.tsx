import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ClassesList } from '@/components/classes-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ClassesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let classes: any[] = []

  if (isDemoMode()) {
    // Demo data for classes
    classes = [
      {
        id: 'demo-class-1',
        name: 'Quran Recitation - Level 1',
        description: 'Basic Quran recitation for beginners',
        grade: '1-3',
        maxStudents: 15,
        schedule: 'Monday, Wednesday, Friday 4:00 PM - 5:00 PM',
        room: 'Room A',
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        teacher: {
          name: 'Omar Khan',
          email: 'staff@demo.com'
        },
        studentClasses: [
          {
            student: { firstName: 'Ahmed', lastName: 'Hassan' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Fatima', lastName: 'Ali' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Yusuf', lastName: 'Patel' },
            enrolledAt: new Date('2024-09-15')
          }
        ],
        _count: {
          studentClasses: 3
        }
      },
      {
        id: 'demo-class-2',
        name: 'Islamic Studies - Level 2',
        description: 'Intermediate Islamic studies and history',
        grade: '4-6',
        maxStudents: 12,
        schedule: 'Tuesday, Thursday 5:00 PM - 6:00 PM',
        room: 'Room B',
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        teacher: {
          name: 'Aisha Patel',
          email: 'parent@demo.com'
        },
        studentClasses: [
          {
            student: { firstName: 'Mariam', lastName: 'Ahmed' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Hassan', lastName: 'Khan' },
            enrolledAt: new Date('2024-09-01')
          }
        ],
        _count: {
          studentClasses: 2
        }
      }
    ]
  } else {
    // Get classes from database
    classes = await prisma.class.findMany({
      where: { orgId: org.id },
      include: {
        teacher: {
          select: { name: true, email: true }
        },
        studentClasses: {
          include: {
            student: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { studentClasses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your classes and student enrollments.
          </p>
        </div>
        <Link href="/classes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Class
          </Button>
        </Link>
      </div>

      <ClassesList classes={classes} />
    </div>
  )
}
