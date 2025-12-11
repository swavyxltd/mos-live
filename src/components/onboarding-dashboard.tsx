'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  Mail,
  Eye
} from 'lucide-react'
import { OnboardingStudentModal } from '@/components/onboarding-student-modal'

interface Student {
  id: string
  firstName: string
  lastName: string
  dob: Date | null
  classes: Array<{
    id: string
    name: string
  }>
  signupStatus: 'not_signed_up' | 'signed_up_not_verified' | 'signed_up_verified'
  parentInfo: {
    id: string
    name: string
    email: string
    phone: string | null
    emailVerified: boolean
    linkedAt: Date | null
  } | null
  claimStatus: string
  createdAt: Date
}

interface Class {
  id: string
  name: string
}

interface OnboardingDashboardProps {
  students: Student[]
  classes: Class[]
  stats: {
    total: number
    notSignedUp: number
    signedUpNotVerified: number
    signedUpVerified: number
  }
}

export function OnboardingDashboard({ students, classes, stats }: OnboardingDashboardProps) {
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Filter by class
      if (selectedClass !== 'all') {
        const hasClass = student.classes.some(c => c.id === selectedClass)
        if (!hasClass) return false
      }

      // Filter by status
      if (selectedStatus !== 'all') {
        if (student.signupStatus !== selectedStatus) return false
      }

      return true
    })
  }, [students, selectedClass, selectedStatus])

  const getStatusBadge = (status: Student['signupStatus']) => {
    switch (status) {
      case 'signed_up_verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed Up & Verified
          </Badge>
        )
      case 'signed_up_not_verified':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Signed Up (Not Verified)
          </Badge>
        )
      case 'not_signed_up':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Not Signed Up
          </Badge>
        )
    }
  }

  const handleRowClick = (student: Student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Signed Up & Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.signedUpVerified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Not Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.signedUpNotVerified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Not Signed Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.notSignedUp}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                Class
              </label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                Signup Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="signed_up_verified">Signed Up & Verified</SelectItem>
                  <SelectItem value="signed_up_not_verified">Signed Up (Not Verified)</SelectItem>
                  <SelectItem value="not_signed_up">Not Signed Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Signup Status</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[var(--muted-foreground)]">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(student)}
                    >
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>
                        {student.classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.classes.map(cls => (
                              <Badge key={cls.id} variant="outline" className="text-xs">
                                {cls.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">No classes</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(student.signupStatus)}
                      </TableCell>
                      <TableCell>
                        {student.parentInfo ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                            <span className="text-sm">{student.parentInfo.email}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRowClick(student)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">View</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Details Modal */}
      {selectedStudent && (
        <OnboardingStudentModal
          student={selectedStudent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedStudent(null)
          }}
        />
      )}
    </div>
  )
}

