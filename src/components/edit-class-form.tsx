'use client'

import { ClassForm } from '@/components/class-form'
import { useRouter } from 'next/navigation'

interface EditClassFormProps {
  classId: string
  initialData: any
}

export function EditClassForm({ classId, initialData }: EditClassFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    // In a real application, you would update the database here
    
    // For demo purposes, we'll just simulate a successful update
    // In production, you would use prisma.class.update()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    
    // Redirect back to class details page
    router.push(`/classes/${classId}`)
  }

  const handleCancel = () => {
    router.push(`/classes/${classId}`)
  }

  return (
    <ClassForm
      initialData={initialData}
      isEditing={true}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
