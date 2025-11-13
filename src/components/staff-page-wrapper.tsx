'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, UserCheck, Shield, GraduationCap, User } from 'lucide-react'
import { TeachersList } from '@/components/teachers-list'
import { EditTeacherModal } from '@/components/edit-teacher-modal'
import { AddTeacherModal } from '@/components/add-teacher-modal'
import { RestrictedAction } from '@/components/restricted-action'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
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

interface StaffPageWrapperProps {
  initialTeachers: Teacher[]
}

export function StaffPageWrapper({ initialTeachers }: StaffPageWrapperProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  const handleAddTeacher = (teacherData: any) => {
    // Add the new teacher to the list
    const newTeacher = {
      ...teacherData,
      id: `teacher-${Date.now()}`, // Generate a temporary ID
      createdAt: new Date(),
      updatedAt: new Date(),
      classes: [],
      _count: { classes: 0 }
    }
    setTeachers(prev => [...prev, newTeacher])
    setIsAddModalOpen(false)
  }

  const handleEditTeacher = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId)
    if (teacher) {
      setSelectedTeacher(teacher)
      setIsEditModalOpen(true)
    }
  }

  const handleUpdateTeacher = (updatedData: any) => {
    setTeachers(prev => 
      prev.map(teacher => 
        teacher.id === selectedTeacher?.id 
          ? { ...teacher, ...updatedData, updatedAt: new Date() }
          : teacher
      )
    )
    setIsEditModalOpen(false)
    setSelectedTeacher(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedTeacher(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage staff members and their login credentials.
          </p>
        </div>
        <RestrictedAction action="add-teacher">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </RestrictedAction>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCheck className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Staff</p>
              <p className="text-2xl font-semibold text-gray-900">{teachers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teachers.filter(t => t.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">With Classes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teachers.filter(t => t._count.classes > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teachers.filter(t => !t.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <TeachersList 
        teachers={teachers} 
        onEditTeacher={handleEditTeacher}
      />
      
      {/* Add Staff Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddTeacher}
      />

      {/* Edit Staff Modal */}
      {selectedTeacher && (
        <EditTeacherModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleUpdateTeacher}
          teacher={selectedTeacher}
        />
      )}
    </div>
  )
}
