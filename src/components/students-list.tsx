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
  Archive,
  Plus,
  Clock,
  XCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

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
  backupPhone: string
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
  claimStatus?: 'NOT_CLAIMED' | 'PENDING_VERIFICATION' | 'CLAIMED'
  claimCode?: string | null
  parentLinks?: Array<{
    id: string
    parent: {
      id: string
      name: string
      email: string
    }
    claimedAt: Date | null
  }>
}

interface Class {
  id: string
  name: string
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
  onStudentUpdate?: (updatedStudent: Student) => void
  classes?: Class[]
  showArchived?: boolean
}

export function StudentsList({ students, filters, onAddStudent, onStudentArchiveChange, onStudentUpdate, classes = [], showArchived = false }: StudentsListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'enrollment' | 'attendance'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [startInEditMode, setStartInEditMode] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-50 border-0'
      case 'INACTIVE':
        return 'bg-gray-50 text-gray-600 border-0'
      case 'DEACTIVATED':
        return 'bg-red-50 text-red-600 border-0'
      case 'GRADUATED':
        return 'bg-blue-50 text-blue-600 border-0'
      default:
        return 'bg-gray-50 text-gray-600 border-0'
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active'
      case 'INACTIVE':
        return 'Inactive'
      case 'DEACTIVATED':
        return 'Deactivated'
      case 'GRADUATED':
        return 'Graduated'
      case 'ARCHIVED':
        return 'Archived'
      default:
        return status.charAt(0) + status.slice(1).toLowerCase()
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    if (rate >= 85) return 'text-orange-600'
    return 'text-red-600'
  }

  const getAttendanceBgColor = (rate: number) => {
    if (rate >= 95) return 'bg-green-100'    // 🟢 Green: 95%+ (Excellent)
    if (rate >= 90) return 'bg-yellow-100'   // 🟡 Yellow: 90-94% (Good)
    if (rate >= 85) return 'bg-orange-100'   // 🟠 Orange: 85-89% (Poor)
    return 'bg-red-100'                      // 🔴 Red: below 84% (Very Poor)
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

  const handleViewStudent = async (student: Student) => {
    // Fetch full student details to get class and teacher info
    try {
      const response = await fetch(`/api/students/${student.id}`)
      if (response.ok) {
        const fullStudent = await response.json()
        
        // Get primary class and teacher
        const primaryClass = fullStudent.StudentClass?.[0]?.Class || null
        const classNames = fullStudent.StudentClass?.map((sc: any) => sc.Class?.name).filter(Boolean) || []
        const className = classNames.length > 0 ? classNames.join(', ') : 'No Class'
        const teacherName = primaryClass?.User?.name || 'No Teacher'
        
        // Format date objects as strings for the modal
        const formattedStudent = {
          ...student,
          dateOfBirth: formatDate(student.dateOfBirth),
          enrollmentDate: student.enrollmentDate instanceof Date ? student.enrollmentDate.toISOString() : student.enrollmentDate,
          createdAt: student.createdAt instanceof Date ? student.createdAt.toISOString() : student.createdAt,
          updatedAt: student.updatedAt instanceof Date ? student.updatedAt.toISOString() : student.updatedAt,
          lastAttendance: student.lastAttendance instanceof Date ? student.lastAttendance.toISOString() : student.lastAttendance,
          // Add missing fields for the modal
          name: `${student.firstName} ${student.lastName}`,
          firstName: student.firstName,
          lastName: student.lastName,
          age: student.age,
          address: student.address,
          class: className,
          teacher: teacherName,
          parentName: student.parentName,
          parentEmail: student.parentEmail,
          parentPhone: student.parentPhone,
          backupPhone: student.backupPhone || '',
          allergies: student.allergies,
          medicalNotes: student.medicalNotes,
          status: student.status,
          overallAttendance: student.attendanceRate || 0,
          weeklyAttendance: student.weeklyAttendance || [],
          recentTrend: 'stable' as 'up' | 'down' | 'stable'
        }
        setSelectedStudentId(student.id)
        setStartInEditMode(false)
        setIsDetailModalOpen(true)
      } else {
        // Fallback if API fails - use available data
        const formattedStudent = {
          ...student,
          dateOfBirth: formatDate(student.dateOfBirth),
          enrollmentDate: student.enrollmentDate instanceof Date ? student.enrollmentDate.toISOString() : student.enrollmentDate,
          createdAt: student.createdAt instanceof Date ? student.createdAt.toISOString() : student.createdAt,
          updatedAt: student.updatedAt instanceof Date ? student.updatedAt.toISOString() : student.updatedAt,
          lastAttendance: student.lastAttendance instanceof Date ? student.lastAttendance.toISOString() : student.lastAttendance,
          name: `${student.firstName} ${student.lastName}`,
          firstName: student.firstName,
          lastName: student.lastName,
          age: student.age,
          address: student.address,
          class: student.classes?.[0]?.name || 'No Class',
          teacher: 'N/A',
          parentName: student.parentName,
          parentEmail: student.parentEmail,
          parentPhone: student.parentPhone,
          backupPhone: student.backupPhone || '',
          allergies: student.allergies,
          medicalNotes: student.medicalNotes,
          status: student.status,
          overallAttendance: student.attendanceRate || 0,
          weeklyAttendance: student.weeklyAttendance || [],
          recentTrend: 'stable' as 'up' | 'down' | 'stable'
        }
        setSelectedStudentId(student.id)
        setStartInEditMode(false)
        setIsDetailModalOpen(true)
      }
    } catch (error) {
      // Fallback if API fails
      const formattedStudent = {
        ...student,
        dateOfBirth: formatDate(student.dateOfBirth),
        enrollmentDate: student.enrollmentDate instanceof Date ? student.enrollmentDate.toISOString() : student.enrollmentDate,
        createdAt: student.createdAt instanceof Date ? student.createdAt.toISOString() : student.createdAt,
        updatedAt: student.updatedAt instanceof Date ? student.updatedAt.toISOString() : student.updatedAt,
        lastAttendance: student.lastAttendance instanceof Date ? student.lastAttendance.toISOString() : student.lastAttendance,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        age: student.age,
        address: student.address,
        class: student.classes?.[0]?.name || 'No Class',
        teacher: 'N/A',
        parentName: student.parentName,
        parentEmail: student.parentEmail,
        parentPhone: student.parentPhone,
        backupPhone: student.backupPhone || '',
        allergies: student.allergies,
        medicalNotes: student.medicalNotes,
        status: student.status,
        overallAttendance: student.attendanceRate || 0,
        weeklyAttendance: student.weeklyAttendance || [],
        recentTrend: 'stable' as 'up' | 'down' | 'stable'
      }
      setSelectedStudentId(student.id)
      setStartInEditMode(false)
      setIsDetailModalOpen(true)
    }
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
      address: student.address,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone,
      backupPhone: student.backupPhone || '',
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
    setIsDetailModalOpen(false)
    setSelectedStudentId(null)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedStudentId(null)
  }

  const handleEditModalClose = () => {
    setIsEditModalOpen(false)
    setStudentToEdit(null)
  }

  const handleEditSave = (updatedStudent: any) => {
    // Transform the updated student to match the Student interface
    const transformedStudent: Student = {
      id: updatedStudent.id,
      firstName: updatedStudent.firstName || updatedStudent.name?.split(' ')[0] || '',
      lastName: updatedStudent.lastName || updatedStudent.name?.split(' ').slice(1).join(' ') || '',
      email: updatedStudent.email || '',
      phone: updatedStudent.phone || '',
      dateOfBirth: updatedStudent.dateOfBirth ? new Date(updatedStudent.dateOfBirth) : new Date(),
      age: updatedStudent.age || 0,
      grade: updatedStudent.grade || '',
      parentName: updatedStudent.parentName || updatedStudent.User?.name || '',
      parentEmail: updatedStudent.parentEmail || updatedStudent.User?.email || '',
      parentPhone: updatedStudent.parentPhone || updatedStudent.User?.phone || '',
      address: updatedStudent.address || '',
      backupPhone: updatedStudent.backupPhone || '',
      allergies: updatedStudent.allergies || 'None',
      medicalNotes: updatedStudent.medicalNotes || '',
      enrollmentDate: updatedStudent.enrollmentDate ? new Date(updatedStudent.enrollmentDate) : new Date(),
      status: updatedStudent.status || 'ACTIVE',
      isArchived: updatedStudent.isArchived || false,
      archivedAt: updatedStudent.archivedAt ? new Date(updatedStudent.archivedAt) : undefined,
      orgId: updatedStudent.orgId || '',
      createdAt: updatedStudent.createdAt ? new Date(updatedStudent.createdAt) : new Date(),
      updatedAt: updatedStudent.updatedAt ? new Date(updatedStudent.updatedAt) : new Date(),
      classes: updatedStudent.classes || updatedStudent.StudentClass?.map((sc: any) => ({
        id: sc.Class?.id || sc.classId || sc.class?.id,
        name: sc.Class?.name || sc.class?.name || sc.className
      })) || [],
      attendanceRate: updatedStudent.attendanceRate || 0,
      lastAttendance: updatedStudent.lastAttendance ? new Date(updatedStudent.lastAttendance) : new Date()
    }
    
    // Call the update callback if provided
    if (onStudentUpdate) {
      onStudentUpdate(transformedStudent)
    }
    
    setIsEditModalOpen(false)
    setStudentToEdit(null)
    
    // Also update the selected student if it's the same one
    // Note: Modal now fetches data from API, so no need to update selectedStudent
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
          if (attendance < 90 || attendance >= 95) return false
          break
        case 'poor':
          if (attendance < 85 || attendance >= 90) return false
          break
        case 'very-poor':
          if (attendance >= 85) return false
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
        // Sort by firstName first, then lastName (A-Z)
        const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
        if (firstNameCompare !== 0) {
          comparison = firstNameCompare
        } else {
          comparison = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
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

  // Show empty state if no students
  if (sortedStudents.length === 0) {
    const hasFilters = filters && Object.values(filters).some(v => v !== '' && v !== null && v !== undefined)
    
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          {hasFilters ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students match your filters</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
              <p className="text-gray-500 mb-4">
                Add your first student to start tracking attendance and managing enrollments.
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Tip: You can add students one at a time or upload multiple students using bulk upload.
              </p>
              {onAddStudent && (
                <Button onClick={onAddStudent} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Student
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

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
                        <TableHead>Age</TableHead>
                        <TableHead className="hidden md:table-cell">Parent</TableHead>
                        <TableHead className="hidden lg:table-cell">Claim Status</TableHead>
                        <TableHead>Attendance (YTD)</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
            <TableBody>
              {sortedStudents.map((student) => (
                <TableRow 
                  key={student.id} 
                  className={`${student.isArchived ? 'bg-gray-50 opacity-75' : ''} cursor-pointer hover:bg-gray-50 transition-colors`}
                  onClick={() => handleViewStudent(student)}
                >
                  <TableCell>
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
                        <div className="text-sm text-gray-500">
                          Archived on {new Date(student.archivedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{student.age}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm font-medium">{student.parentName}</div>
                    <div className="text-sm text-gray-500">{student.parentEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            student.attendanceRate >= 95 ? 'bg-green-500' :
                            student.attendanceRate >= 90 ? 'bg-yellow-500' :
                            student.attendanceRate >= 85 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${student.attendanceRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getAttendanceColor(student.attendanceRate)}`}>
                        {student.attendanceRate}%
                      </span>
                      {student.attendanceRate < 90 && (
                        <AlertTriangle className={`h-4 w-4 ${
                          student.attendanceRate >= 85 ? 'text-orange-500' : 'text-red-500'
                        }`} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge 
                      variant="outline"
                      className={student.isArchived 
                        ? 'bg-gray-50 text-gray-600 border-0' 
                        : getStatusColor(student.status)}
                    >
                      {student.isArchived ? 'Archived' : formatStatus(student.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
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
        studentId={selectedStudentId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onEdit={(studentId) => {
          const student = students.find(s => s.id === studentId)
          if (student) {
            handleEditStudent(student)
          }
        }}
        onArchive={onStudentArchiveChange}
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
