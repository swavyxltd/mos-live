'use client'

import { useState } from 'react'
import { StudentsList } from '@/components/students-list'
import { StudentsFilters } from '@/components/students-filters'
import { AddStudentModal } from '@/components/add-student-modal'

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
  isArchived: boolean
  archivedAt?: Date
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

interface StudentsPageClientProps {
  students: Student[]
  classes: Class[]
  onAddStudent?: (studentData: any) => void
  onStudentArchiveChange?: (id: string, isArchived: boolean) => void
  onStudentUpdate?: (updatedStudent: Student) => void
  showArchived?: boolean
}

export function StudentsPageClient({ students, classes, onAddStudent, onStudentArchiveChange, onStudentUpdate, showArchived = false }: StudentsPageClientProps) {
  const [filters, setFilters] = useState({
    search: '',
    selectedClass: '',
    ageRange: '',
    enrollmentDateRange: '',
    allergies: '',
    attendanceRange: '',
    status: '',
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleAddStudent = (studentData: any) => {
    if (onAddStudent) {
      onAddStudent(studentData)
    }
    setIsAddModalOpen(false)
  }

  return (
    <>
      <StudentsFilters 
        classes={classes} 
        onFiltersChange={handleFiltersChange}
      />
      <StudentsList
        students={students}
        filters={filters}
        onAddStudent={() => setIsAddModalOpen(true)}
        onStudentArchiveChange={onStudentArchiveChange}
        onStudentUpdate={onStudentUpdate}
        classes={classes}
        showArchived={showArchived}
      />
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddStudent}
        classes={classes}
      />
    </>
  )
}
