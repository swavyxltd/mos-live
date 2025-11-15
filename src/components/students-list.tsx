'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StudentDetailModal } from '@/components/student-detail-modal'
import { EditStudentModal } from '@/components/edit-student-modal'
import { 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Edit,
  Trash2,
  Archive
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

interface StudentsListProps {
  students: Student[]
  filters?: {
    search: string
    selectedClass: string
    ageRange: string
    enrollmentDateRange: string
    allergies: string
    attendanceRange: string
    status: string
  }
  onAddStudent?: () => void
  onStudentArchiveChange?: (id: string, isArchived: boolean) => void
  classes?: Class[]
  showArchived?: boolean
}

export function StudentsList({ students, filters, onAddStudent, onStudentArchiveChange, classes = [], showArchived = false }: StudentsListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'enrollment' | 'attendance'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [startInEditMode, setStartInEditMode] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'DEACTIVATED':
        return 'bg-red-100 text-red-800'
      case 'GRADUATED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 86) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getAttendanceBgColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-100'    // 🟢 Green: 95%+ (Excellent)
    if (rate >= 86) return 'bg-yellow-100'   // 🟡 Yellow: 86-94% (Good)
    return 'bg-red-100'                      // 🔴 Red: below 86% (Needs Improvement)
  }

  const getAgeFromDate = (dateOfBirth: Date) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleViewStudent = (student: Student) => {
    // Format date objects as strings for the modal
    const formattedStudent = {
      ...student,
      dateOfBirth: student.dateOfBirth instanceof Date ? student.dateOfBirth.toLocaleDateString() : student.dateOfBirth,
      enrollmentDate: student.enrollmentDate instanceof Date ? student.enrollmentDate.toLocaleDateString() : student.enrollmentDate,
      createdAt: student.createdAt instanceof Date ? student.createdAt.toLocaleDateString() : student.createdAt,
      updatedAt: student.updatedAt instanceof Date ? student.updatedAt.toLocaleDateString() : student.updatedAt,
      lastAttendance: student.lastAttendance instanceof Date ? student.lastAttendance.toLocaleDateString() : student.lastAttendance,
      // Add missing fields for the modal
      name: `${student.firstName} ${student.lastName}`,
      firstName: student.firstName,
      lastName: student.lastName,
      age: student.age,
      grade: student.grade,
      address: student.address,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone,
      emergencyContact: student.emergencyContact,
      allergies: student.allergies,
      medicalNotes: student.medicalNotes,
      status: student.status,
      overallAttendance: student.attendanceRate || 0,
      weeklyAttendance: student.weeklyAttendance || [],
      recentTrend: 'stable' as 'up' | 'down' | 'stable'
    }
    setSelectedStudent(formattedStudent)
    setStartInEditMode(false)
    setIsDetailModalOpen(true)
  }

  const handleEditStudent = (student: Student) => {
    // Format date objects as strings for the edit modal
    const formattedStudent = {
      ...student,
      dateOfBirth: student.dateOfBirth instanceof Date ? student.dateOfBirth.toISOString().split('T')[0] : student.dateOfBirth,
      enrollmentDate: student.enrollmentDate instanceof Date ? student.enrollmentDate.toLocaleDateString() : student.enrollmentDate,
      createdAt: student.createdAt instanceof Date ? student.createdAt.toLocaleDateString() : student.createdAt,
      updatedAt: student.updatedAt instanceof Date ? student.updatedAt.toLocaleDateString() : student.updatedAt,
      lastAttendance: student.lastAttendance instanceof Date ? student.lastAttendance.toLocaleDateString() : student.lastAttendance,
      // Add missing fields for the modal
      name: `${student.firstName} ${student.lastName}`,
      firstName: student.firstName,
      lastName: student.lastName,
      age: student.age,
      grade: student.grade,
      address: student.address,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone,
      emergencyContact: student.emergencyContact,
      allergies: student.allergies,
      medicalNotes: student.medicalNotes,
      status: student.status,
      overallAttendance: student.attendanceRate || 0,
      weeklyAttendance: student.weeklyAttendance || [],
      recentTrend: 'stable' as 'up' | 'down' | 'stable'
    }
    setStudentToEdit(formattedStudent)
    setIsEditModalOpen(true)
  }

  const handleDeleteStudent = (studentId: string) => {
    // TODO: Implement delete functionality
    console.log('Delete student:', studentId)
    setIsDetailModalOpen(false)
    setSelectedStudent(null)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedStudent(null)
  }

  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
    setStudentToEdit(null)
  }

  const handleEditSave = (updatedStudent: any) => {
    // TODO: Update the student in the list
    console.log('Student updated:', updatedStudent)
    setIsEditModalOpen(false)
    setStudentToEdit(null)
    // You might want to refresh the student list or update the local state here
  }

  // Filter students based on current filters
  const filteredStudents = students.filter(student => {
    if (!filters) return true

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
            const matchesSearch = 
              student.firstName.toLowerCase().includes(searchTerm) ||
              student.lastName.toLowerCase().includes(searchTerm) ||
              student.parentName.toLowerCase().includes(searchTerm) ||
              student.parentEmail.toLowerCase().includes(searchTerm)
      if (!matchesSearch) return false
    }

    // Class filter
    if (filters.selectedClass) {
      const hasClass = student.classes.some(cls => cls.id === filters.selectedClass)
      if (!hasClass) return false
    }

    // Age range filter
    if (filters.ageRange) {
      const age = student.age
      switch (filters.ageRange) {
        case '5-7':
          if (age < 5 || age > 7) return false
          break
        case '8-10':
          if (age < 8 || age > 10) return false
          break
        case '11-13':
          if (age < 11 || age > 13) return false
          break
        case '14+':
          if (age < 14) return false
          break
      }
    }

    // Enrollment date filter
    if (filters.enrollmentDateRange) {
      const now = new Date()
      const enrollmentDate = new Date(student.enrollmentDate)
      const daysDiff = Math.floor((now.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (filters.enrollmentDateRange) {
        case 'last-week':
          if (daysDiff > 7) return false
          break
        case 'last-month':
          if (daysDiff > 30) return false
          break
        case 'last-3-months':
          if (daysDiff > 90) return false
          break
        case 'last-6-months':
          if (daysDiff > 180) return false
          break
        case 'last-year':
          if (daysDiff > 365) return false
          break
      }
    }

    // Allergies filter
    if (filters.allergies) {
      switch (filters.allergies) {
        case 'none':
          if (student.allergies && student.allergies !== 'None') return false
          break
        case 'has-allergies':
          if (!student.allergies || student.allergies === 'None') return false
          break
        case 'peanuts':
          if (!student.allergies || !student.allergies.toLowerCase().includes('peanut')) return false
          break
        case 'dairy':
          if (!student.allergies || !student.allergies.toLowerCase().includes('dairy')) return false
          break
        case 'shellfish':
          if (!student.allergies || !student.allergies.toLowerCase().includes('shellfish')) return false
          break
        case 'tree-nuts':
          if (!student.allergies || !student.allergies.toLowerCase().includes('tree nut')) return false
          break
      }
    }

    // Attendance range filter
    if (filters.attendanceRange) {
      const attendance = student.attendanceRate
      switch (filters.attendanceRange) {
        case 'excellent':
          if (attendance < 95) return false
          break
        case 'good':
          if (attendance < 86 || attendance >= 95) return false
          break
        case 'poor':
          if (attendance >= 86) return false
          break
      }
    }

    // Status filter
    if (filters.status) {
      if (student.status !== filters.status) return false
    }

    return true
  })

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'name':
        // Sort by lastName first, then firstName (A-Z)
        const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
        if (lastNameCompare !== 0) {
          comparison = lastNameCompare
        } else {
          comparison = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
        }
        break
      case 'age':
        comparison = a.age - b.age
        break
      case 'enrollment':
        comparison = a.enrollmentDate.getTime() - b.enrollmentDate.getTime()
        break
      case 'attendance':
        comparison = a.attendanceRate - b.attendanceRate
        break
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="age">Age</SelectItem>
              <SelectItem value="enrollment">Enrollment Date</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Clean Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Age/Grade</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
            <TableBody>
              {sortedStudents.map((student) => (
                <TableRow key={student.id} className={student.isArchived ? 'bg-gray-50 opacity-75' : ''}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getAttendanceBgColor(student.attendanceRate)}`}>
                        <span className="text-sm font-medium text-gray-700">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {student.firstName} {student.lastName}
                          {student.isArchived && (
                            <Badge variant="secondary" className="text-xs">
                              <Archive className="h-3 w-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                        </div>
                        {student.isArchived && student.archivedAt && (
                          <div className="text-xs text-gray-500">
                            Archived on {new Date(student.archivedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">Age {student.age}</div>
                    <div className="text-sm text-gray-500">Grade {student.grade}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{student.parentName}</div>
                    <div className="text-sm text-gray-500">{student.parentEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            student.attendanceRate >= 95 ? 'bg-green-500' :
                            student.attendanceRate >= 86 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${student.attendanceRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getAttendanceColor(student.attendanceRate)}`}>
                        {student.attendanceRate}%
                      </span>
                      {student.attendanceRate < 86 && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={student.isArchived ? 'bg-gray-100 text-gray-800' : getStatusColor(student.status)}>
                      {student.isArchived ? 'ARCHIVED' : student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewStudent(student)}
                        title="View student details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditStudent(student)}
                        title="Edit student"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onEdit={handleEditStudent}
        onDelete={handleDeleteStudent}
        onArchive={onStudentArchiveChange}
        startInEditMode={startInEditMode}
        classes={classes}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSave={handleEditSave}
        student={studentToEdit}
        classes={classes}
      />
    </div>
  )
}
