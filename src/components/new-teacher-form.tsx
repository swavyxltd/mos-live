'use client'

import { TeacherForm } from '@/components/teacher-form'
import { useRouter } from 'next/navigation'

export function NewTeacherForm() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    // In a real application, you would save to the database here
    console.log('Creating new teacher:', data)
    
    // For demo purposes, we'll just simulate a successful creation
    // In production, you would use prisma.teacher.create()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    
    // Redirect back to teachers page
    router.push('/teachers')
  }

  const handleCancel = () => {
    router.push('/teachers')
  }

  return (
    <TeacherForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
