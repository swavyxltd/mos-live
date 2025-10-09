'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { 
  X, 
  Mail, 
  Phone, 
  Calendar, 
  Heart, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Save,
  X as CloseIcon,
  BookOpen
} from 'lucide-react'

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: Date
  age: number
  grade: string
  parentName: string
  parentEmail: string
  parentPhone: string
  address: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  enrollmentDate: Date
  status: string
  classes: Array<{
    id: string
    name: string
  }>
  attendanceRate: number
  lastAttendance: Date
}

interface Class {
  id: string
  name: string
  grade: string
}

interface StudentDetailModalProps {
  student: Student | null
  isOpen: boolean
  onClose: () => void
  onEdit: (student: Student) => void
  onDelete: (studentId: string) => void
  startInEditMode?: boolean
  classes?: Class[]
}

export function StudentDetailModal({ student, isOpen, onClose, onEdit, onDelete, startInEditMode = false, classes = [] }: StudentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedStudent, setEditedStudent] = useState<Student | null>(null)

  // Initialize edited student when modal opens
  useEffect(() => {
    if (student && isOpen) {
      setEditedStudent({ ...student })
      setIsEditing(startInEditMode)
    }
  }, [student, isOpen, startInEditMode])

  if (!student) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800'
      case 'GRADUATED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    if (rate >= 80) return 'text-orange-600'
    return 'text-red-600'
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editedStudent) {
      onEdit(editedStudent)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditedStudent({ ...student })
    setIsEditing(false)
  }

  const handleFieldChange = (field: keyof Student, value: string | number | Date) => {
    if (editedStudent) {
      setEditedStudent({
        ...editedStudent,
        [field]: value
      })
    }
  }

  const handleClassToggle = (classId: string) => {
    if (editedStudent) {
      const isCurrentlyEnrolled = editedStudent.classes.some(cls => cls.id === classId)
      const classInfo = classes.find(c => c.id === classId)
      
      if (isCurrentlyEnrolled) {
        // Remove class
        setEditedStudent({
          ...editedStudent,
          classes: editedStudent.classes.filter(cls => cls.id !== classId)
        })
      } else {
        // Add class
        if (classInfo) {
          setEditedStudent({
            ...editedStudent,
            classes: [...editedStudent.classes, { id: classInfo.id, name: classInfo.name }]
          })
        }
      }
    }
  }

  const currentStudent = editedStudent || student

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={`${currentStudent.firstName} ${currentStudent.lastName}`}
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Student Header */}
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {currentStudent.firstName.charAt(0)}{currentStudent.lastName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-gray-600">Age {currentStudent.age} • Grade {currentStudent.grade}</p>
            <Badge className={getStatusColor(currentStudent.status)}>
              {currentStudent.status}
            </Badge>
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
                <label className="text-sm font-medium text-gray-900">First Name</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Last Name</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.lastName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Date of Birth</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.dateOfBirth.toISOString().split('T')[0]}
                    onChange={(e) => handleFieldChange('dateOfBirth', new Date(e.target.value))}
                    className="w-full"
                    type="date"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.dateOfBirth.toLocaleDateString('en-GB')}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Age</label>
                <p className="text-sm text-gray-600">{currentStudent.age} years old</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Address</label>
              {isEditing ? (
                <Textarea
                  value={currentStudent.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full"
                  rows={2}
                />
              ) : (
                <p className="text-sm text-gray-600">{currentStudent.address}</p>
              )}
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
                <label className="text-sm font-medium text-gray-900">Parent Name</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.parentName}
                    onChange={(e) => handleFieldChange('parentName', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.parentName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Parent Email</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.parentEmail}
                    onChange={(e) => handleFieldChange('parentEmail', e.target.value)}
                    className="w-full"
                    type="email"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.parentEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Parent Phone</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.parentPhone}
                    onChange={(e) => handleFieldChange('parentPhone', e.target.value)}
                    className="w-full"
                    type="tel"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.parentPhone}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Emergency Contact</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.emergencyContact}
                    onChange={(e) => handleFieldChange('emergencyContact', e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.emergencyContact}</p>
                )}
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
              {isEditing ? (
                <Input
                  value={currentStudent.allergies}
                  onChange={(e) => handleFieldChange('allergies', e.target.value)}
                  className="w-full"
                  placeholder="Enter allergies or 'None'"
                />
              ) : (
                <p className="text-sm text-gray-600">{currentStudent.allergies}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Medical Notes</label>
              {isEditing ? (
                <Textarea
                  value={currentStudent.medicalNotes}
                  onChange={(e) => handleFieldChange('medicalNotes', e.target.value)}
                  className="w-full"
                  rows={3}
                  placeholder="Enter any medical notes or conditions"
                />
              ) : (
                <p className="text-sm text-gray-600">{currentStudent.medicalNotes || 'No medical notes'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Grade</label>
              {isEditing ? (
                <Input
                  value={currentStudent.grade}
                  onChange={(e) => handleFieldChange('grade', e.target.value)}
                  className="w-full"
                  placeholder="Enter grade level"
                />
              ) : (
                <p className="text-sm text-gray-600">Grade {currentStudent.grade}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Enrolled Classes ({currentStudent.classes.length})</p>
              {isEditing ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Select classes for this student:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {classes.map((cls) => {
                      const isEnrolled = currentStudent.classes.some(enrolledClass => enrolledClass.id === cls.id)
                      return (
                        <div
                          key={cls.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isEnrolled
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
                              isEnrolled
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isEnrolled && (
                                <div className="w-2 h-2 bg-white rounded-sm"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {currentStudent.classes.length === 0 && (
                    <p className="text-sm text-amber-600">No classes selected. Student will be enrolled later.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentStudent.classes.map((cls) => (
                    <Badge key={cls.id} variant="outline">
                      {cls.name}
                    </Badge>
                  ))}
                  {currentStudent.classes.length === 0 && (
                    <p className="text-sm text-gray-500">No classes enrolled</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Attendance Rate</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.attendanceRate}
                    onChange={(e) => handleFieldChange('attendanceRate', parseInt(e.target.value) || 0)}
                    className="w-full"
                    type="number"
                    min="0"
                    max="100"
                  />
                ) : (
                  <p className={`text-2xl font-bold ${getAttendanceColor(currentStudent.attendanceRate)}`}>
                    {currentStudent.attendanceRate}%
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Status</label>
                {isEditing ? (
                  <Select
                    value={currentStudent.status}
                    onValueChange={(value) => handleFieldChange('status', value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="GRADUATED">Graduated</option>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(currentStudent.status)}>
                    {currentStudent.status}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Enrollment Date</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.enrollmentDate.toISOString().split('T')[0]}
                    onChange={(e) => handleFieldChange('enrollmentDate', new Date(e.target.value))}
                    className="w-full"
                    type="date"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.enrollmentDate.toLocaleDateString()}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Last Attendance</label>
                {isEditing ? (
                  <Input
                    value={currentStudent.lastAttendance.toISOString().split('T')[0]}
                    onChange={(e) => handleFieldChange('lastAttendance', new Date(e.target.value))}
                    className="w-full"
                    type="date"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{currentStudent.lastAttendance.toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <CloseIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Student
              </Button>
              <Button variant="destructive" onClick={() => onDelete(currentStudent.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Student
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}