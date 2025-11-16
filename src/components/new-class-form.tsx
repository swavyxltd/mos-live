'use client'

import { ClassForm } from '@/components/class-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function NewClassForm() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    try {
      // Convert schedule object to string format
      const scheduleString = JSON.stringify({
        days: data.schedule.days,
        startTime: data.schedule.startTime,
        endTime: data.schedule.endTime
      })

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          schedule: scheduleString,
          teacherId: data.teacherId || null,
          monthlyFeeP: data.monthlyFee || 0,
          feeDueDay: data.feeDueDay || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create class')
      }

      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }

      toast.success('Class created successfully')
      router.push('/classes')
    } catch (error: any) {
      console.error('Error creating class:', error)
      toast.error(error.message || 'Failed to create class')
      throw error
    }
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
