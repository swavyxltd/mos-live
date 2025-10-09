'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { TeacherForm } from '@/components/teacher-form'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  classes: Array<{
    id: string
    name: string
  }>
  _count: {
    classes: number
  }
}

interface EditTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  teacher: Teacher
}

export function EditTeacherModal({ isOpen, onClose, onSave, teacher }: EditTeacherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)
    
    try {
      // In a real application, you would update the database here
      console.log('Updating teacher:', teacher.id, data)
      
      // For demo purposes, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      onSave(data)
    } catch (error) {
      console.error('Error updating teacher:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Teacher">
      <div className="max-h-[80vh] overflow-y-auto">
        <TeacherForm
          initialData={{
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            username: teacher.username,
            password: '', // Don't pre-fill password for security
            isActive: teacher.isActive
          }}
          isEditing={true}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </Modal>
  )
}
