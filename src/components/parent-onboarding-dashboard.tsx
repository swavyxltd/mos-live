'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'

interface Student {
  id: string
  firstName: string
  lastName: string
  claimStatus: 'NOT_CLAIMED' | 'PENDING_VERIFICATION' | 'CLAIMED'
  classes: Array<{
    id: string
    name: string
  }>
  claimedBy: {
    id: string
    name: string
    email: string
    phone: string | null
    emailVerified: boolean
  } | null
  parentLinks: Array<{
    id: string
    parent: {
      id: string
      name: string
      email: string
      phone: string | null
      emailVerified: boolean
    }
    claimedAt: Date | null
  }>
}

interface Class {
  id: string
  name: string
}

interface ParentOnboardingDashboardProps {
  students: Student[]
  classes: Class[]
  stats: {
    claimed: number
    notClaimed: number
    pending: number
    total: number
  }
}

export function ParentOnboardingDashboard({ students, classes, stats }: ParentOnboardingDashboardProps) {
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

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
        if (student.claimStatus !== selectedStatus) return false
      }

      return true
    })
  }, [students, selectedClass, selectedStatus])

  const getStatusBadge = (status: Student['claimStatus'], emailVerified?: boolean) => {
    switch (status) {
      case 'CLAIMED':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Claimed
          </Badge>
        )
      case 'PENDING_VERIFICATION':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {emailVerified === false ? 'Pending Email Verification' : 'Pending'}
          </Badge>
        )
      case 'NOT_CLAIMED':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Not Claimed
          </Badge>
        )
    }
  }

  const handleResendVerification = async (parentEmail: string) => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parentEmail })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resend verification email')
      }

      toast.success('Verification email sent successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email')
    }
  }

  const getParentEmail = (student: Student): string | null => {
    if (student.claimedBy) {
      return student.claimedBy.email
    }
    if (student.parentLinks.length > 0) {
      return student.parentLinks[0].parent.email
    }
    return null
  }

  const getParentEmailVerified = (student: Student): boolean => {
    if (student.claimedBy) {
      return student.claimedBy.emailVerified
    }
    if (student.parentLinks.length > 0) {
      return student.parentLinks[0].parent.emailVerified
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Parent Onboarding Status</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Track which parents have created accounts and verified their emails
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
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
              Claimed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.claimed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Not Claimed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.notClaimed}</div>
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
                Claim Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CLAIMED">Claimed</SelectItem>
                  <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                  <SelectItem value="NOT_CLAIMED">Not Claimed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent Status</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-8">
                      No students found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map(student => {
                    const parentEmail = getParentEmail(student)
                    const emailVerified = getParentEmailVerified(student)
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>
                          {student.classes.map(c => c.name).join(', ') || 'No class'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(student.claimStatus, emailVerified)}
                        </TableCell>
                        <TableCell>
                          {parentEmail || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {parentEmail && !emailVerified && student.claimStatus === 'PENDING_VERIFICATION' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendVerification(parentEmail)}
                                title="Resend verification email"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = `/students?studentId=${student.id}`}
                              title="View student"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="text-center text-[var(--muted-foreground)] py-8">
                No students found matching the filters
              </div>
            ) : (
              filteredStudents.map(student => {
                const parentEmail = getParentEmail(student)
                const emailVerified = getParentEmailVerified(student)
                
                return (
                  <div
                    key={student.id}
                    className="p-4 border border-[var(--border)] rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--foreground)] mb-1">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          {student.classes.map(c => c.name).join(', ') || 'No class'}
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(student.claimStatus, emailVerified)}
                      </div>
                    </div>
                    {parentEmail && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                          <span className="text-[var(--muted-foreground)] break-all">{parentEmail}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2">
                      {parentEmail && !emailVerified && student.claimStatus === 'PENDING_VERIFICATION' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendVerification(parentEmail)}
                          className="flex-1"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Email
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/students?studentId=${student.id}`}
                        className={parentEmail && !emailVerified && student.claimStatus === 'PENDING_VERIFICATION' ? 'flex-1' : 'w-full'}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Student
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

