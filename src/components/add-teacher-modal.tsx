'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { TeacherForm } from '@/components/teacher-form'
import { toast } from 'sonner'

interface AddTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

export function AddTeacherModal({ isOpen, onClose, onSave }: AddTeacherModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError('')
    
    try {
      // Get the active org ID
      const orgResponse = await fetch('/api/orgs')
      if (!orgResponse.ok) {
        throw new Error('Failed to get organization')
      }
      const orgs = await orgResponse.json()
      const activeOrg = orgs.find((org: any) => org.isActive) || orgs[0]
      
      if (!activeOrg) {
        throw new Error('No organization found')
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          orgId: activeOrg.id,
          role: 'STAFF',
          sendInvitation: true, // Always send invitation for staff
          isActive: data.isActive !== false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create staff member')
        setIsSubmitting(false)
        return
      }

      const result = await response.json()
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }
      
      toast.success('Staff member created successfully. Invitation email sent.')
      onSave(result.user)
      onClose()
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Add New Staff">
      <div className="max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        <TeacherForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </Modal>
  )
}
