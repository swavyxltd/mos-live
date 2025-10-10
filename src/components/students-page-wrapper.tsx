'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Users, Calendar, Heart, AlertTriangle } from 'lucide-react'
import { StudentsPageClient } from '@/components/students-page-client'
import { AddStudentModal } from '@/components/add-student-modal'
import { AddStudentSuccessModal } from '@/components/add-student-success-modal'

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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'GRADUATED'
  isArchived: boolean
  archivedAt?: Date
  orgId: string
  createdAt: Date
  updatedAt: Date
  classes: Array<{ id: string; name: string }>
  attendanceRate: number
  lastAttendance: Date
}

interface Class {
  id: string
  name: string
  grade: string
}

interface StudentsPageWrapperProps {
  initialStudents: Student[]
  classes: Class[]
}

export function StudentsPageWrapper({ initialStudents, classes }: StudentsPageWrapperProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [newStudentData, setNewStudentData] = useState<any>(null)

  const handleAddStudent = (studentData: any) => {
    // Add the new student to the list
    setStudents(prev => [...prev, studentData])
    
    // Store student data for success modal
    setNewStudentData(studentData)
    
    // Close add modal and show success modal
    setIsAddModalOpen(false)
    setIsSuccessModalOpen(true)
  }

  const handleSendInvite = () => {
    // TODO: Implement send invite email functionality
    console.log('Send invite email to:', newStudentData?.parentEmail)
    // For now, just show a placeholder message
    alert('Invite email functionality will be configured later')
  }

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false)
    setNewStudentData(null)
  }

  const handleStudentArchiveChange = (id: string, isArchived: boolean) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === id 
          ? { ...student, isArchived, archivedAt: isArchived ? new Date() : undefined }
          : student
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student information and enrollments.
          </p>
        </div>
        <Button onClick={() => {
          setIsAddModalOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">New This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {students.filter(s => s.enrollmentDate >= new Date('2024-12-01')).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">With Allergies</p>
              <p className="text-2xl font-semibold text-gray-900">
                {students.filter(s => s.allergies && s.allergies !== 'None').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Attendance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {students.filter(s => s.attendanceRate < 90).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Students List */}
      <StudentsPageClient 
        students={students} 
        classes={classes} 
        onAddStudent={handleAddStudent}
        onStudentArchiveChange={handleStudentArchiveChange}
      />
      
      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddStudent}
        classes={classes}
      />

      {/* Success Modal */}
      {newStudentData && (
        <AddStudentSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={handleCloseSuccessModal}
          onSendInvite={handleSendInvite}
          studentName={`${newStudentData.firstName} ${newStudentData.lastName}`}
          parentEmail={newStudentData.parentEmail}
        />
      )}
    </div>
  )
}
