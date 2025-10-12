'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DeleteTeacherButtonProps {
  teacherId: string
  teacherName: string
}

export function DeleteTeacherButton({ teacherId, teacherName }: DeleteTeacherButtonProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchiveStaff = () => {
    setIsDialogOpen(true)
  }

  const handleConfirmArchive = async () => {
    setIsArchiving(true)
    try {
      console.log(`Archiving staff member: ${teacherId}`)
      // TODO: Implement actual archive API call
      // For now, just log the action and redirect
      console.log(`Staff member ${teacherName} would be archived (demo mode)`)
      setIsDialogOpen(false)
      router.push('/staff')
    } catch (error) {
      console.error('Error archiving staff member:', error)
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={handleArchiveStaff}>
        <Trash2 className="h-4 w-4 mr-2" />
        Archive Staff
      </Button>

      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Staff Member"
        message={`Are you sure you want to archive ${teacherName}? This will disable their account and remove them from active staff.`}
        confirmText="Archive Staff"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isArchiving}
      />
    </>
  )
}
