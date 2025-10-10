'use client'

import { ClassForm } from '@/components/class-form'
import { useRouter } from 'next/navigation'

export function NewClassForm() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    // In a real application, you would save to the database here
    console.log('Creating new class:', data)
    
    // For demo purposes, we'll just simulate a successful creation
    // In production, you would use prisma.class.create()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    
    // Redirect back to classes page
    router.push('/classes')
  }

  const handleCancel = () => {
    router.push('/classes')
  }

  return (
    <ClassForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
