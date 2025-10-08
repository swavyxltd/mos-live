import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { EditTeacherForm } from '@/components/edit-teacher-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface EditTeacherPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditTeacherPage({ params }: EditTeacherPageProps) {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  const { id } = await params
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let teacherData: any = null

  if (isDemoMode()) {
    // Demo data for teacher editing
    const demoTeachers = [
      {
        id: 'teacher-1',
        name: 'Omar Khan',
        email: 'omar@demo.com',
        phone: '+44 7700 900123',
        username: 'omar.khan',
        isActive: true
      },
      {
        id: 'teacher-2',
        name: 'Aisha Patel',
        email: 'aisha@demo.com',
        phone: '+44 7700 900124',
        username: 'aisha.patel',
        isActive: true
      },
      {
        id: 'teacher-3',
        name: 'Ahmed Hassan',
        email: 'ahmed@demo.com',
        phone: '+44 7700 900125',
        username: 'ahmed.hassan',
        isActive: false
      },
      {
        id: 'teacher-4',
        name: 'Fatima Ali',
        email: 'fatima@demo.com',
        phone: '+44 7700 900126',
        username: 'fatima.ali',
        isActive: true
      }
    ]

    teacherData = demoTeachers.find(teacher => teacher.id === id)
  }

  if (!teacherData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teachers">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Teachers
            </button>
          </Link>
        </div>
        <div className="max-w-4xl">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Teacher not found</h3>
            <p className="text-gray-500">The teacher you're trying to edit doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teachers/${id}`}>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Details
          </button>
        </Link>
      </div>

      <div className="max-w-4xl">
        <EditTeacherForm
          teacherId={id}
          initialData={teacherData}
        />
      </div>
    </div>
  )
}
