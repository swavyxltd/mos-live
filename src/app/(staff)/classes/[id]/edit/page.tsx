import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { EditClassForm } from '@/components/edit-class-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface EditClassPageProps {
  params: {
    id: string
  }
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let classData: any = null

  if (isDemoMode()) {
    // Demo data for class editing
    const demoClasses = [
      {
        id: 'demo-class-1',
        name: 'Quran Recitation - Level 1',
        description: 'Basic Quran recitation for beginners',
        grade: '1-3',
        maxStudents: 15,
        room: 'Room A',
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          startTime: '4:00 PM',
          endTime: '5:00 PM'
        },
        teacherId: 'teacher-1'
      },
      {
        id: 'demo-class-2',
        name: 'Islamic Studies - Level 2',
        description: 'Intermediate Islamic studies and history',
        grade: '4-6',
        maxStudents: 12,
        room: 'Room B',
        schedule: {
          days: ['Tuesday', 'Thursday'],
          startTime: '5:00 PM',
          endTime: '6:00 PM'
        },
        teacherId: 'teacher-2'
      }
    ]

    classData = demoClasses.find(cls => cls.id === params.id)
  }

  if (!classData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </button>
          </Link>
        </div>
        <div className="max-w-4xl">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Class not found</h3>
            <p className="text-gray-500">The class you're trying to edit doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/classes/${params.id}`}>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Class Details
          </button>
        </Link>
      </div>

      <div className="max-w-4xl">
        <EditClassForm
          classId={params.id}
          initialData={classData}
        />
      </div>
    </div>
  )
}
