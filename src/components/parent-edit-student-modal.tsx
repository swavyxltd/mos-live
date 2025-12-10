'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Save, User, MapPin, Heart, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Student {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  grade: string
  address: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  classes?: Array<{ id: string; name: string }>
}

interface ParentEditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (studentData: any) => void
  student: Student | null
}

export function ParentEditStudentModal({ isOpen, onClose, onSave, student }: ParentEditStudentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    allergies: 'None',
    medicalNotes: '',
    emergencyContact: '',
    address: ''
  })

  const [isLoading, setIsLoading] = useState(false)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Initialize form data when student changes
  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        dateOfBirth: student.dateOfBirth || '',
        allergies: student.allergies || 'None',
        medicalNotes: student.medicalNotes || '',
        emergencyContact: student.emergencyContact || '',
        address: student.address || ''
      })
    }
  }, [student])

  const handleInputChange = (field: string, value: string) => {
    // Auto-capitalize first letter for name fields
    if ((field === 'firstName' || field === 'lastName') && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    // Capitalize first letter of each word for address
    if (field === 'address' && value.length > 0) {
      value = value.split(' ').map(word => {
        if (word.length === 0) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }).join(' ')
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    // Import validation functions
    const { isValidName, isValidDateOfBirth, isValidAddressLine } = await import('@/lib/input-validation')
    
    // Validate first name
    if (!formData.firstName.trim()) {
      toast.error('First name is required')
      return
    }
    if (!isValidName(formData.firstName)) {
      toast.error('First name must be a valid name (2-50 characters, letters only)')
      return
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      toast.error('Last name is required')
      return
    }
    if (!isValidName(formData.lastName)) {
      toast.error('Last name must be a valid name (2-50 characters, letters only)')
      return
    }

    // Validate date of birth if provided
    if (formData.dateOfBirth && !isValidDateOfBirth(formData.dateOfBirth)) {
      toast.error('Date of birth must be a valid date (not in the future, age 0-120 years)')
      return
    }

    // Validate address if provided
    if (formData.address && formData.address.trim() && !isValidAddressLine(formData.address)) {
      toast.error('Address must be a valid address (5-100 characters)')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/parent/students/${student?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          allergies: formData.allergies,
          medicalNotes: formData.medicalNotes,
          emergencyContact: formData.emergencyContact,
          address: formData.address
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update student' }))
        throw new Error(errorData.error || 'Failed to update student')
      }

      const updatedStudent = await response.json()
      
      // Trigger refresh events for dynamic updates across the app
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      window.dispatchEvent(new CustomEvent('refresh-student-list'))
      window.dispatchEvent(new CustomEvent('refresh-student-data', { detail: updatedStudent }))
      
      // Call the onSave callback with updated data
      onSave({
        ...student,
        ...updatedStudent
      })
      
      toast.success('Child information updated successfully!')
      onClose()
    } catch (error: any) {
      toast.error(`Failed to update child information: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !student) return null

  return (
    <div 
      className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-4xl my-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef2ff]">
                    <User className="h-5 w-5 text-[#1d4ed8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                      Edit Child Information
                    </h2>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Update your child's details
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 text-[var(--muted-foreground)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Child Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            placeholder="Enter first name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            placeholder="Enter last name"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address</Label>
                        <div className="relative mt-1">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            placeholder="Enter address"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        <Input
                          id="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                          placeholder="Enter emergency contact"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Heart className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Medical Information</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="allergies">Allergies</Label>
                        <Input
                          id="allergies"
                          value={formData.allergies}
                          onChange={(e) => handleInputChange('allergies', e.target.value)}
                          placeholder="Enter allergies or 'None'"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="medicalNotes">Medical Notes</Label>
                        <Textarea
                          id="medicalNotes"
                          value={formData.medicalNotes}
                          onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
                          placeholder="Enter any medical notes or special requirements"
                          rows={5}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-[var(--border)]">
              <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

