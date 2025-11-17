'use client'

import { TeacherForm } from '@/components/teacher-form'
import { useRouter } from 'next/navigation'

interface EditTeacherFormProps {
  teacherId: string
  initialData: any
}

export function EditTeacherForm({ teacherId, initialData }: EditTeacherFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    // In a real application, you would update the database here
    
    // For demo purposes, we'll just simulate a successful update
    // In production, you would use prisma.staff.update()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    
    // Redirect back to staff details page
    router.push(`/staff/${teacherId}`)
  }

  const handleCancel = () => {
    router.push(`/staff/${teacherId}`)
  }

  return (
    <TeacherForm
      initialData={initialData}
      isEditing={true}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
