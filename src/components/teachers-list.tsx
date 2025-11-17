'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StaffDetailModal } from '@/components/staff-detail-modal'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  UserCheck, 
  Mail, 
  Phone, 
  User, 
  GraduationCap, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Key,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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
    students: number
  }>
  _count: {
    classes: number
  }
}

interface TeachersListProps {
  teachers: Teacher[]
  onEditTeacher?: (teacherId: string) => void
}

export function TeachersList({ teachers, onEditTeacher }: TeachersListProps) {
  const [archiveTeacherId, setArchiveTeacherId] = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [teacherToArchive, setTeacherToArchive] = useState<{ id: string; name: string } | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchiveTeacher = async (teacherId: string, teacherName: string) => {
    setTeacherToArchive({ id: teacherId, name: teacherName })
    setIsArchiveDialogOpen(true)
  }

  const handleConfirmArchive = async () => {
    if (!teacherToArchive) return
    
    setIsArchiving(true)
    try {
      // TODO: Implement actual archive API call
      
      // Close dialogs and reset state
      setIsArchiveDialogOpen(false)
      setTeacherToArchive(null)
    } catch (error) {
    } finally {
      setIsArchiving(false)
    }
  }

  const handleViewTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedTeacher(null)
  }

  const handleEditFromModal = (teacherId: string) => {
    if (onEditTeacher) {
      onEditTeacher(teacherId)
    }
    handleCloseModal()
  }

  const handleArchiveFromModal = async (teacherId: string, teacherName: string) => {
    await handleArchiveTeacher(teacherId, teacherName)
    handleCloseModal()
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No staff yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first staff member.</p>
          <Link href="/staff/new">
            <Button>Add Staff Member</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Classes</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 hidden sm:block">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {teacher.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="sm:ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{teacher._count.classes} classes</span>
                    </div>
                    {teacher.classes.length > 0 && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-500">
                          {teacher.classes.slice(0, 2).map(c => c.name).join(', ')}
                          {teacher.classes.length > 2 && ` +${teacher.classes.length - 2} more`}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {teacher._count.students || 0}
                        <span className="hidden sm:inline"> students</span>
                      </span>
                    </div>
                    {teacher._count.students > 0 && (
                      <div className="mt-1 hidden sm:block">
                        <div className="text-xs text-gray-500">
                          {teacher.classes.length > 0 
                            ? `Across ${teacher.classes.length} class${teacher.classes.length > 1 ? 'es' : ''}`
                            : 'No active classes'
                          }
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center">
                      <Badge 
                        variant="outline"
                        className={teacher.isActive 
                          ? 'text-green-600 bg-green-50 border-0 dark:bg-green-950 dark:text-green-200' 
                          : 'bg-gray-50 text-gray-600 border-0 dark:bg-gray-800 dark:text-gray-200'}
                      >
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewTeacher(teacher)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEditTeacher ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hidden sm:inline-flex"
                          onClick={() => onEditTeacher(teacher.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Link href={`/staff/${teacher.id}/edit`} className="hidden sm:inline-flex">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleArchiveTeacher(teacher.id, teacher.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff Detail Modal */}
      <StaffDetailModal
        staff={selectedTeacher}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEditFromModal}
        onArchive={handleArchiveFromModal}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => {
          setIsArchiveDialogOpen(false)
          setTeacherToArchive(null)
        }}
        onConfirm={handleConfirmArchive}
        title="Archive Staff Member"
        message={`Are you sure you want to archive ${teacherToArchive?.name}? This will disable their account and remove them from active staff.`}
        confirmText="Archive Staff"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isArchiving}
      />
    </div>
  )
}
