'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ClassesList } from '@/components/classes-list'
import { RestrictedAction } from '@/components/restricted-action'

interface Class {
  id: string
  name: string
  description: string | null
  schedule: string
  teacherId: string | null
  monthlyFeeP: number
  createdAt: Date
  User: {
    name: string | null
    email: string
  } | null
  StudentClass: Array<{
    Student: {
      firstName: string
      lastName: string
      isArchived: boolean
    }
  }>
  _count: {
    StudentClass: number
  }
}

interface ClassesPageClientProps {
  classes: Class[]
}

export function ClassesPageClient({ classes }: ClassesPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your classes and student enrollments.
          </p>
        </div>
        <RestrictedAction action="create-class">
          <Link href="/classes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Class
            </Button>
          </Link>
        </RestrictedAction>
      </div>

      <ClassesList classes={classes} />
    </div>
  )
}

