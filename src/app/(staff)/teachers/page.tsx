import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { TeachersList } from '@/components/teachers-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TeachersPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let teachers: any[] = []

  if (isDemoMode()) {
    // Demo data for teachers
    teachers = [
      {
        id: 'teacher-1',
        name: 'Omar Khan',
        email: 'omar@demo.com',
        phone: '+44 7700 900123',
        username: 'omar.khan',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-1', name: 'Quran Recitation - Level 1' },
          { id: 'class-3', name: 'Arabic Language - Level 1' }
        ],
        _count: {
          classes: 2
        }
      },
      {
        id: 'teacher-2',
        name: 'Aisha Patel',
        email: 'aisha@demo.com',
        phone: '+44 7700 900124',
        username: 'aisha.patel',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-2', name: 'Islamic Studies - Level 2' }
        ],
        _count: {
          classes: 1
        }
      },
      {
        id: 'teacher-3',
        name: 'Ahmed Hassan',
        email: 'ahmed@demo.com',
        phone: '+44 7700 900125',
        username: 'ahmed.hassan',
        isActive: false,
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-12-01'),
        classes: [],
        _count: {
          classes: 0
        }
      },
      {
        id: 'teacher-4',
        name: 'Fatima Ali',
        email: 'fatima@demo.com',
        phone: '+44 7700 900126',
        username: 'fatima.ali',
        isActive: true,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [],
        _count: {
          classes: 0
        }
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage teachers and their login credentials.
          </p>
        </div>
        <Link href="/teachers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </Link>
      </div>

      <TeachersList teachers={teachers} />
    </div>
  )
}
