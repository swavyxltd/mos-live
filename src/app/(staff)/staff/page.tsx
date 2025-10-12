import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { StaffPageWrapper } from '@/components/staff-page-wrapper'

export default async function StaffPage() {
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
        name: 'Moulana Omar',
        email: 'omar@demo.com',
        phone: '+44 7700 900123',
        username: 'omar.khan',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-1', name: 'Quran Recitation - Level 1', students: 12 },
          { id: 'class-3', name: 'Arabic Language - Level 1', students: 8 }
        ],
        _count: {
          classes: 2,
          students: 20
        }
      },
      {
        id: 'teacher-2',
        name: 'Apa Aisha',
        email: 'aisha@demo.com',
        phone: '+44 7700 900124',
        username: 'aisha.patel',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-2', name: 'Islamic Studies - Level 2', students: 15 }
        ],
        _count: {
          classes: 1,
          students: 15
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
          classes: 0,
          students: 0
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
          classes: 0,
          students: 0
        }
      }
    ]
  }

  return (
    <StaffPageWrapper initialTeachers={teachers} />
  )
}
