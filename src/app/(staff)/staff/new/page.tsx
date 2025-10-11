import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { NewTeacherForm } from '@/components/new-teacher-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewStaffPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

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
        <NewTeacherForm />
      </div>
    </div>
  )
}
