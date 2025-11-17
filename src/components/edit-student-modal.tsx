'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Save, User, Mail, Phone, MapPin, Heart, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Student {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  grade: string
  parentName: string
  parentEmail: string
  parentPhone: string
  address: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  status: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'GRADUATED'
  isArchived: boolean
  archivedAt?: string
  classes?: Array<{ id: string }>
}

interface Class {
  id: string
  name: string
  grade: string
}

interface EditStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (studentData: any) => void
  student: Student | null
  classes: Class[]
}

export function EditStudentModal({ isOpen, onClose, onSave, student, classes }: EditStudentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    grade: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    address: '',
    emergencyContact: '',
    allergies: 'None',
    medicalNotes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'GRADUATED',
    selectedClasses: [] as string[]
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
        grade: student.grade || '',
        parentName: student.parentName || '',
        parentEmail: student.parentEmail || '',
        parentPhone: student.parentPhone || '',
        address: student.address || '',
        emergencyContact: student.emergencyContact || '',
        allergies: student.allergies || 'None',
        medicalNotes: student.medicalNotes || '',
        status: student.status || 'ACTIVE',
        selectedClasses: (student.classes && Array.isArray(student.classes)) 
          ? student.classes.map((cls: any) => cls.id || cls).filter(Boolean)
          : []
      })
    }
  }, [student])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleClassToggle = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }))
  }

  const handleSave = async () => {
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required')
      return
    }

    if (!formData.parentName.trim() || !formData.parentEmail.trim()) {
      toast.error('Parent name and email are required')
      return
    }

    setIsLoading(true)

    try {
      // Prepare the updated student data
      const updatedStudentData = {
        ...student,
        ...formData,
        id: student?.id,
        name: `${formData.firstName} ${formData.lastName}`,
        // Keep existing fields that aren't being edited
        isArchived: student?.isArchived || false,
        archivedAt: student?.archivedAt
      }

      // Determine API endpoint based on whether we're in owner portal
      const isOwnerPortal = window.location.pathname.startsWith('/owner/')
      const apiEndpoint = isOwnerPortal 
        ? `/api/owner/students/${student?.id}`
        : `/api/students/${student?.id}`

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          allergies: formData.allergies,
          medicalNotes: formData.medicalNotes,
          parentName: formData.parentName,
          parentEmail: formData.parentEmail,
          parentPhone: formData.parentPhone,
          selectedClasses: formData.selectedClasses
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update student' }))
        throw new Error(errorData.error || 'Failed to update student')
      }

      const updatedStudent = await response.json()
      
      // Trigger dashboard refresh
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      if (window.location.pathname.startsWith('/owner/')) {
        window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      }
      
      // Call the onSave callback with updated data
      onSave({
        ...updatedStudentData,
        ...updatedStudent
      })
      
      toast.success('Student updated successfully!')
      onClose()
    } catch (error: any) {
      toast.error(`Failed to update student: ${error.message}`)
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
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef2ff] dark:bg-blue-950">
                      <User className="h-5 w-5 text-[#1d4ed8] dark:text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                      Edit Student
                    </h2>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Update student information
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
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Student Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-xs text-[var(--muted-foreground)]">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            placeholder="Enter first name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-xs text-[var(--muted-foreground)]">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            placeholder="Enter last name"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dateOfBirth" className="text-xs text-[var(--muted-foreground)]">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="grade" className="text-xs text-[var(--muted-foreground)]">Grade</Label>
                          <Input
                            id="grade"
                            value={formData.grade}
                            onChange={(e) => handleInputChange('grade', e.target.value)}
                            placeholder="Enter grade"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-xs text-[var(--muted-foreground)]">Address</Label>
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
                        <Label htmlFor="status" className="text-xs text-[var(--muted-foreground)]">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                            <SelectItem value="GRADUATED">Graduated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Parent Information</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="parentName" className="text-xs text-[var(--muted-foreground)]">Parent Name *</Label>
                        <Input
                          id="parentName"
                          value={formData.parentName}
                          onChange={(e) => handleInputChange('parentName', e.target.value)}
                          placeholder="Enter parent name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="parentEmail" className="text-xs text-[var(--muted-foreground)]">Parent Email *</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                          <Input
                            id="parentEmail"
                            type="email"
                            value={formData.parentEmail}
                            onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                            placeholder="Enter parent email"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="parentPhone" className="text-xs text-[var(--muted-foreground)]">Parent Phone</Label>
                        <div className="relative mt-1">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                          <Input
                            id="parentPhone"
                            value={formData.parentPhone}
                            onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                            placeholder="Enter parent phone"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="emergencyContact" className="text-xs text-[var(--muted-foreground)]">Emergency Contact</Label>
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
                        <Label htmlFor="allergies" className="text-xs text-[var(--muted-foreground)]">Allergies</Label>
                        <Input
                          id="allergies"
                          value={formData.allergies}
                          onChange={(e) => handleInputChange('allergies', e.target.value)}
                          placeholder="Enter allergies or 'None'"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="medicalNotes" className="text-xs text-[var(--muted-foreground)]">Medical Notes</Label>
                        <Textarea
                          id="medicalNotes"
                          value={formData.medicalNotes}
                          onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
                          placeholder="Enter any medical notes"
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Class Enrollment */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Class Enrollment</h3>
                    <div className="space-y-2">
                      {classes.map((cls) => (
                        <div key={cls.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`class-${cls.id}`}
                            checked={formData.selectedClasses.includes(cls.id)}
                            onChange={() => handleClassToggle(cls.id)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`class-${cls.id}`} className="text-sm">
                            {cls.name} ({cls.grade})
                          </Label>
                        </div>
                      ))}
                      {classes.length === 0 && (
                        <p className="text-sm text-[var(--muted-foreground)]">No classes available</p>
                      )}
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
