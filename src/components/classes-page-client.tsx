'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ClassesList } from '@/components/classes-list'
import { RestrictedAction } from '@/components/restricted-action'
import { AddClassModal } from '@/components/add-class-modal'
import { useRouter } from 'next/navigation'

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const router = useRouter()

  const handleAddClass = (classData: any) => {
    // Refresh the page to show the new class
    router.refresh()
    setIsAddModalOpen(false)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Classes</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
            Manage your classes and student enrollments.
          </p>
        </div>
        <RestrictedAction action="create-class">
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Class
          </Button>
        </RestrictedAction>
      </div>

      <ClassesList classes={classes} />

      <AddClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddClass}
      />
    </div>
  )
}

