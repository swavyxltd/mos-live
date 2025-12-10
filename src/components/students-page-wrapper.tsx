'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Users, Calendar, Heart, AlertTriangle, Archive, ArchiveRestore, ChevronDown, CheckCircle } from 'lucide-react'
import { StudentsPageClient } from '@/components/students-page-client'
import { AddStudentModal } from '@/components/add-student-modal'
import { BulkUploadStudentsModal } from '@/components/bulk-upload-students-modal'
import { RestrictedAction } from '@/components/restricted-action'
import { StatCard } from '@/components/ui/stat-card'

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: Date
  age: number
  parentName: string
  parentEmail: string
  parentPhone: string
  address: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  enrollmentDate: Date
  status: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'GRADUATED'
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
}

interface StudentsPageWrapperProps {
  initialStudents: Student[]
  classes: Class[]
}

export function StudentsPageWrapper({ initialStudents, classes }: StudentsPageWrapperProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      window.location.reload()
    }
    
    window.addEventListener('refresh-students', handleRefresh)
    
    return () => {
      window.removeEventListener('refresh-students', handleRefresh)
    }
  }, [])

  const handleAddStudent = async (studentData: any) => {
    // Close add modal
    setIsAddModalOpen(false)
    
    // Refresh the page to get updated student list
    window.location.reload()
  }

  const handleStudentUpdate = (updatedStudent: Student) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === updatedStudent.id 
          ? updatedStudent
          : student
      )
    )
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Students</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
          
          <RestrictedAction action="add-student">
            <div className="flex">
              <Button onClick={() => setIsAddModalOpen(true)} className="rounded-r-none">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="default" className="px-2 border-l border-white/20 rounded-l-none">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsAddModalOpen(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Single Student
                </DropdownMenuItem>
                <RestrictedAction action="add-student">
                  <DropdownMenuItem onClick={() => setIsBulkUploadModalOpen(true)} className="cursor-pointer">
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Add Students
                  </DropdownMenuItem>
                </RestrictedAction>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </RestrictedAction>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title={showArchived ? 'Archived Students' : 'Total Students'}
          value={showArchived 
            ? students.filter(s => s.isArchived).length 
            : students.filter(s => !s.isArchived).length
          }
          icon={<Users className="h-4 w-4 text-blue-600" />}
          className="border-l-4 border-l-blue-500 bg-blue-50/30"
        />
        
        <StatCard
          title="New This Month"
          value={students.filter(s => {
            const enrollmentDate = s.enrollmentDate instanceof Date ? s.enrollmentDate : new Date(s.enrollmentDate)
            const firstOfMonth = new Date()
            firstOfMonth.setDate(1)
            firstOfMonth.setHours(0, 0, 0, 0)
            return enrollmentDate >= firstOfMonth
          }).length}
          description="Enrolled this month"
          icon={<Calendar className="h-4 w-4 text-green-600" />}
          className="border-l-4 border-l-green-500 bg-green-50/30"
        />
        
        <StatCard
          title="With Allergies"
          value={students.filter(s => s.allergies && s.allergies !== 'None' && s.allergies.trim() !== '').length}
          description="Require special attention"
          icon={<Heart className="h-4 w-4 text-red-600" />}
          className="border-l-4 border-l-red-500 bg-red-50/30"
        />
        
        <StatCard
          title="Low Attendance"
          value={students.filter(s => s.attendanceRate < 86).length}
          description="Below 86% threshold"
          icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
          className="border-l-4 border-l-yellow-500 bg-yellow-50/30"
        />
      </div>

      {/* Filters and Students List */}
      <StudentsPageClient 
        students={showArchived ? students.filter(s => s.isArchived) : students.filter(s => !s.isArchived)} 
        classes={classes} 
        onAddStudent={handleAddStudent}
        onStudentArchiveChange={handleStudentArchiveChange}
        onStudentUpdate={handleStudentUpdate}
        showArchived={showArchived}
      />
      
      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddStudent}
        classes={classes}
      />

      {/* Bulk Upload Students Modal */}
      <BulkUploadStudentsModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onSuccess={handleAddStudent}
        classes={classes}
      />

    </div>
  )
}
