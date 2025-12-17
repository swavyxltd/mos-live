'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { TeacherForm } from '@/components/teacher-form'
import { toast } from 'sonner'
import { StaffPermissionKey } from '@/types/staff-roles'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
  role?: string
  staffSubrole?: string
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
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [initialData, setInitialData] = useState<any>(null)
  const [error, setError] = useState('')
  const [hasFormChanges, setHasFormChanges] = useState(false)

  // Fetch current permissions when modal opens
  useEffect(() => {
    if (isOpen && teacher.id) {
      fetchTeacherData()
    }
  }, [isOpen, teacher.id])

  const fetchTeacherData = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Get active org
      const orgResponse = await fetch('/api/orgs')
      if (!orgResponse.ok) {
        throw new Error('Failed to get organisation')
      }
      const orgs = await orgResponse.json()
      const activeOrg = orgs.find((org: any) => org.isActive) || orgs[0]
      
      if (!activeOrg) {
        throw new Error('No organisation found')
      }

      // Fetch current permissions
      const permissionsResponse = await fetch(
        `/api/staff/permissions?userId=${teacher.id}&orgId=${activeOrg.id}`
      )
      
      let permissions: StaffPermissionKey[] = []
      if (permissionsResponse.ok) {
        const data = await permissionsResponse.json()
        permissions = data.permissions || []
      }

      const data = {
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        username: teacher.username,
        password: '', // Don't pre-fill password for security
        isActive: teacher.isActive,
        staffSubrole: teacher.staffSubrole || 'TEACHER',
        permissionKeys: permissions
      }
      setInitialData(data)
      setHasFormChanges(false)
    } catch (error: any) {
      setError(error.message || 'Failed to load staff data')
      // Set basic data even if permissions fail
      const data = {
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        username: teacher.username,
        password: '',
        isActive: teacher.isActive,
        staffSubrole: teacher.staffSubrole || 'TEACHER',
        permissionKeys: []
      }
      setInitialData(data)
      setHasFormChanges(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if there are unsaved changes (warn if modal is open - TeacherForm manages its own state)
  const hasUnsavedChanges = () => {
    if (!isOpen || !initialData || isSubmitting) return false
    // Since TeacherForm manages its own state, we'll warn if modal is open
    // This is a safety measure to prevent accidental navigation
    return true
  }

  // Use the unsaved changes warning hook (only when modal is open)
  const { startSaving, finishSaving } = useUnsavedChangesWarning({
    hasUnsavedChanges,
    enabled: isOpen && initialData !== null && !isSubmitting
  })

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError('')
    startSaving()
    
    try {
      // Get active org
      const orgResponse = await fetch('/api/orgs')
      if (!orgResponse.ok) {
        throw new Error('Failed to get organisation')
      }
      const orgs = await orgResponse.json()
      const activeOrg = orgs.find((org: any) => org.isActive) || orgs[0]
      
      if (!activeOrg) {
        throw new Error('No organisation found')
      }

      // Get membership ID
      const membershipResponse = await fetch(`/api/staff?userId=${teacher.id}&orgId=${activeOrg.id}`)
      if (!membershipResponse.ok) {
        throw new Error('Failed to get staff membership')
      }
      const membershipData = await membershipResponse.json()
      const membershipId = membershipData.membership?.id

      if (!membershipId) {
        throw new Error('Staff membership not found')
      }

      // Update permissions
      const permissionsResponse = await fetch('/api/staff/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId,
          permissionKeys: data.permissionKeys || [],
          staffSubrole: data.staffSubrole
        })
      })

      if (!permissionsResponse.ok) {
        const errorData = await permissionsResponse.json()
        throw new Error(errorData.error || 'Failed to update permissions')
      }

      // Update user info (if needed, create separate endpoint or update existing)
      // For now, we'll just update permissions
      
      toast.success('Staff member updated successfully')
      
      // Always refresh to ensure permissions are updated in real-time
      // This updates the sidebar, route protection, and all server components
      router.refresh()
      
      // Small delay to ensure server components refresh before closing modal
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Trigger dashboard refresh for staff list
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }
      
      setHasFormChanges(false)
      onSave(data)
      onClose()
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
      finishSaving()
    }
  }

  const handleCancel = () => {
    setError('')
    setHasFormChanges(false)
    onClose()
  }

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Staff">
        <div className="p-8 text-center">
          <p className="text-gray-600">Loading staff data...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Staff">
      <div className="max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {initialData && (
          <TeacherForm
            initialData={initialData}
            isEditing={true}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </div>
    </Modal>
  )
}
