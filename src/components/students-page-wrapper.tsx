'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Users, Calendar, Heart, AlertTriangle, Archive, ArchiveRestore } from 'lucide-react'
import { StudentsPageClient } from '@/components/students-page-client'
import { AddStudentModal } from '@/components/add-student-modal'
import { RestrictedAction } from '@/components/restricted-action'

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
  const [showArchived, setShowArchived] = useState(false)

  const handleAddStudent = async (studentData: any) => {
    // Close add modal
    setIsAddModalOpen(false)
    
    // Refresh the page to get updated student list
    window.location.reload()
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
        <div className="flex gap-2">
          <Button 
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Show Active
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Show Archived
              </>
            )}
          </Button>
          <RestrictedAction action="add-student" onClick={() => setIsAddModalOpen(true)}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </RestrictedAction>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                {showArchived ? 'Archived Students' : 'Total Students'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {showArchived 
                  ? students.filter(s => s.isArchived).length 
                  : students.filter(s => !s.isArchived).length
                }
              </p>
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
                {students.filter(s => s.attendanceRate < 86).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Students List */}
      <StudentsPageClient 
        students={showArchived ? students.filter(s => s.isArchived) : students.filter(s => !s.isArchived)} 
        classes={classes} 
        onAddStudent={handleAddStudent}
        onStudentArchiveChange={handleStudentArchiveChange}
        showArchived={showArchived}
      />
      
      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddStudent}
        classes={classes}
      />

    </div>
  )
}
