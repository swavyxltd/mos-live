'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Heart, 
  Save,
  X as CloseIcon,
  BookOpen,
  Loader2
} from 'lucide-react'
import { isValidName, isValidEmailStrict, isValidDateOfBirth } from '@/lib/input-validation'

interface Class {
  id: string
  name: string
}

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (studentData: any) => void
  classes: Class[]
}

export function AddStudentModal({ isOpen, onClose, onSave, classes }: AddStudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    parentEmail: '',
    classId: '',
    startMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    status: 'ACTIVE'
  })

  const handleInputChange = (field: string, value: string) => {
    // Auto-capitalize first letter for name fields
    if ((field === 'firstName' || field === 'lastName') && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.classId || !formData.startMonth) {
      setError('Please fill in all required fields (First Name, Last Name, Date of Birth, Class, Start Month).')
      return
    }

    // Validate first name
    if (!isValidName(formData.firstName)) {
      setError('First name must be a valid name (2-50 characters, letters only)')
      return
    }

    // Validate last name
    if (!isValidName(formData.lastName)) {
      setError('Last name must be a valid name (2-50 characters, letters only)')
      return
    }

    // Validate date of birth
    if (!isValidDateOfBirth(formData.dateOfBirth)) {
      setError('Date of birth must be a valid date (not in the future, age 0-120 years)')
      return
    }

    // Validate email format if provided
    if (formData.parentEmail && !isValidEmailStrict(formData.parentEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/students/create-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          parentEmail: formData.parentEmail || null,
          classId: formData.classId,
          startMonth: formData.startMonth,
          status: formData.status
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setError(error.error || 'Failed to create student')
        setIsSubmitting(false)
        return
      }

      const data = await response.json()
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }
      
      onSave(data.student)
      onClose()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      parentEmail: '',
      classId: '',
      startMonth: new Date().toISOString().slice(0, 7),
      status: 'ACTIVE'
    })
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Add New Student"
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Student Information */}
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full"
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full"
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Date of Birth *</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className="w-full"
                required
              />
            </div>
        </div>

        {/* Parent Information */}
        <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Parent Email</label>
              <Input
                type="email"
                value={formData.parentEmail}
                onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                className="w-full"
                placeholder="Enter parent email address (optional)"
              />
              <p className="text-sm text-gray-500">An invitation email will be sent to this address for the parent to complete setup. Leave blank if parent email is not available.</p>
            </div>
        </div>

        {/* Class & Enrollment */}
        <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Class *</label>
              <select
                value={formData.classId}
                onChange={(e) => handleInputChange('classId', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-gray-400"
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Start Month *</label>
              <Input
                type="month"
                value={formData.startMonth}
                onChange={(e) => handleInputChange('startMonth', e.target.value)}
                className="w-full"
                required
              />
              <p className="text-sm text-gray-500">The first payment record will be created for this month.</p>
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Add Student{formData.parentEmail ? ' & Send Invite' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}