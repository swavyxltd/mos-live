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

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  const classData = await prisma.class.findFirst({
    where: {
      id: params.id,
      orgId: org.id
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })

  // Transform the data to match the expected format
  const transformedClassData = classData ? {
    id: classData.id,
    name: classData.name,
    description: classData.description || '',
    grade: '', // Not stored in current schema
    maxStudents: 0, // Not stored in current schema
    room: '', // Not stored in current schema
    schedule: classData.schedule as any,
    teacherId: classData.teacherId || classData.User?.id || ''
  } : null

  if (!transformedClassData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </button>
          </Link>
        </div>
        <div className="max-w-4xl">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Class not found</h3>
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
          initialData={transformedClassData}
        />
      </div>
    </div>
  )
}
