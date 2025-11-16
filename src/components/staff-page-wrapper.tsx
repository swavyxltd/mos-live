'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, UserCheck, Shield, GraduationCap, User } from 'lucide-react'
import { TeachersList } from '@/components/teachers-list'
import { EditTeacherModal } from '@/components/edit-teacher-modal'
import { AddTeacherModal } from '@/components/add-teacher-modal'
import { RestrictedAction } from '@/components/restricted-action'
import { StatCard } from '@/components/ui/stat-card'

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
    
    // Trigger dashboard refresh
    window.dispatchEvent(new CustomEvent('refresh-dashboard'))
    if (window.location.pathname.startsWith('/owner/')) {
      window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
    }
    
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Staff</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Staff"
          value={teachers.length}
          icon={<UserCheck className="h-4 w-4 text-blue-600" />}
          className="border-l-4 border-l-blue-500 bg-blue-50/30"
        />
        
        <StatCard
          title="Active"
          value={teachers.filter(t => t.isActive).length}
          description="Currently active"
          icon={<Shield className="h-4 w-4 text-green-600" />}
          className="border-l-4 border-l-green-500 bg-green-50/30"
        />
        
        <StatCard
          title="With Classes"
          value={teachers.filter(t => t._count.classes > 0).length}
          description="Assigned to classes"
          icon={<GraduationCap className="h-4 w-4 text-purple-600" />}
          className="border-l-4 border-l-purple-500 bg-purple-50/30"
        />
        
        <StatCard
          title="Inactive"
          value={teachers.filter(t => !t.isActive).length}
          description="Not currently active"
          icon={<User className="h-4 w-4 text-orange-600" />}
          className="border-l-4 border-l-orange-500 bg-orange-50/30"
        />
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
