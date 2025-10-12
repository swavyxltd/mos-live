import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { EditTeacherForm } from '@/components/edit-teacher-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Staff - Madrasah OS',
}

interface EditStaffPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditStaffPage({ params }: EditStaffPageProps) {
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
    // Demo data for staff editing
    const demoStaff = [
      {
        id: 'teacher-1',
        name: 'Moulana Omar',
        email: 'omar@demo.com',
        phone: '+44 7700 900123',
        username: 'omar.khan',
        isActive: true,
        staffSubrole: 'ADMIN'
      },
      {
        id: 'teacher-2',
        name: 'Apa Aisha',
        email: 'aisha@demo.com',
        phone: '+44 7700 900124',
        username: 'aisha.patel',
        isActive: true,
        staffSubrole: 'TEACHER'
      },
      {
        id: 'teacher-3',
        name: 'Ahmed Hassan',
        email: 'ahmed@demo.com',
        phone: '+44 7700 900125',
        username: 'ahmed.hassan',
        isActive: false,
        staffSubrole: 'TEACHER'
      },
      {
        id: 'teacher-4',
        name: 'Fatima Ali',
        email: 'fatima@demo.com',
        phone: '+44 7700 900126',
        username: 'fatima.ali',
        isActive: true,
        staffSubrole: 'FINANCE_OFFICER'
      }
    ]

    teacherData = demoStaff.find(staff => staff.id === id)
  }

  if (!teacherData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Staff
            </button>
          </Link>
        </div>
        <div className="max-w-4xl">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Staff member not found</h3>
            <p className="text-gray-500">The staff member you're trying to edit doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/staff/${id}`}>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Staff Details
          </button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Staff</h1>
        <p className="mt-1 text-sm text-gray-500">Update staff member information and permissions</p>
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
