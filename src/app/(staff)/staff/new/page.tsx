import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { NewTeacherForm } from '@/components/new-teacher-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Add New Staff - Madrasah OS',
}

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
          <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Staff
          </button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Add New Staff</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Create a new staff member account with appropriate permissions</p>
      </div>

      <div className="max-w-4xl">
        <NewTeacherForm />
      </div>
    </div>
  )
}
