'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Heart, 
  Save,
  X as CloseIcon,
  BookOpen
} from 'lucide-react'

interface Class {
  id: string
  name: string
  grade: string
}

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (studentData: any) => void
  classes: Class[]
}

export function AddStudentModal({ isOpen, onClose, onSave, classes }: AddStudentModalProps) {
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
    status: 'ACTIVE',
    selectedClasses: [] as string[]
  })

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

  const handleSave = () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.parentName || !formData.parentEmail) {
      alert('Please fill in all required fields (First Name, Last Name, Parent Name, Parent Email).')
      return
    }

    const newStudent = {
      id: `new-student-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: '',
      phone: '',
      dateOfBirth: new Date(formData.dateOfBirth),
      age: new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear(),
      grade: formData.grade,
      parentName: formData.parentName,
      parentEmail: formData.parentEmail,
      parentPhone: formData.parentPhone,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      allergies: formData.allergies,
      medicalNotes: formData.medicalNotes,
      enrollmentDate: new Date(),
      status: formData.status,
      orgId: 'demo-org',
      createdAt: new Date(),
      updatedAt: new Date(),
      classes: formData.selectedClasses.map(classId => {
        const classInfo = classes.find(c => c.id === classId)
        return classInfo ? { id: classInfo.id, name: classInfo.name } : null
      }).filter(Boolean),
      attendanceRate: 100,
      lastAttendance: new Date(),
    }
    onSave(newStudent)
    onClose()
  }

  const handleClose = () => {
    setFormData({
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
      status: 'ACTIVE',
      selectedClasses: []
    })
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Add New Student"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Student Header */}
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">New Student Information</h3>
            <p className="text-sm text-gray-500">Fill in all required fields to add a new student</p>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full"
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full"
                  placeholder="Enter last name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Date of Birth *</label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Grade *</label>
                <Input
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  className="w-full"
                  placeholder="Enter grade level"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Address *</label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full"
                rows={2}
                placeholder="Enter full address"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parent Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Parent Name *</label>
                <Input
                  value={formData.parentName}
                  onChange={(e) => handleInputChange('parentName', e.target.value)}
                  className="w-full"
                  placeholder="Enter parent/guardian name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Parent Email *</label>
                <Input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                  className="w-full"
                  placeholder="Enter parent email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Parent Phone *</label>
                <Input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  className="w-full"
                  placeholder="Enter parent phone number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Emergency Contact *</label>
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  className="w-full"
                  placeholder="Enter emergency contact details"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Allergies</label>
              <Input
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                className="w-full"
                placeholder="Enter allergies or 'None'"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Medical Notes</label>
              <Textarea
                value={formData.medicalNotes}
                onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
                className="w-full"
                rows={3}
                placeholder="Enter any medical notes or conditions"
              />
            </div>
          </CardContent>
        </Card>

        {/* Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Class Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Select Classes</label>
              <p className="text-sm text-gray-500">Choose which classes this student will be enrolled in</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.selectedClasses.includes(cls.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleClassToggle(cls.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{cls.name}</div>
                        <div className="text-xs text-gray-500">Grade {cls.grade}</div>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        formData.selectedClasses.includes(cls.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.selectedClasses.includes(cls.id) && (
                          <div className="w-2 h-2 bg-white rounded-sm"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {formData.selectedClasses.length === 0 && (
                <p className="text-sm text-amber-600">No classes selected. Student will be enrolled later.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>
    </Modal>
  )
}