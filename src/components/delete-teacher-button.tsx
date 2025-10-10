'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DeleteTeacherButtonProps {
  teacherId: string
  teacherName: string
}

export function DeleteTeacherButton({ teacherId, teacherName }: DeleteTeacherButtonProps) {
  const router = useRouter()

  const handleDeleteTeacher = async () => {
    if (confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      console.log(`Deleting teacher: ${teacherId}`)
      // TODO: Implement actual delete API call
      // For now, just log the action and redirect
      alert(`Teacher ${teacherName} would be deleted (demo mode)`)
      router.push('/teachers')
    }
  }

  return (
    <Button variant="destructive" onClick={handleDeleteTeacher}>
      <Trash2 className="h-4 w-4 mr-2" />
      Delete Teacher
    </Button>
  )
}
