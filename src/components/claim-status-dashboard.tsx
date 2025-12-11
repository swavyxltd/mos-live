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
  Download,
  RefreshCw,
  Copy,
  FileText,
  QrCode
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Student {
  id: string
  firstName: string
  lastName: string
  claimCode: string | null
  claimStatus: 'NOT_CLAIMED' | 'PENDING_VERIFICATION' | 'CLAIMED'
  claimCodeExpiresAt: Date | null
  classes: Array<{
    id: string
    name: string
    teacher: {
      id: string
      name: string
      email: string
    } | null
  }>
  claimedBy: {
    id: string
    name: string
    email: string
    phone: string | null
  } | null
  parentLinks: Array<{
    id: string
    parent: {
      id: string
      name: string
      email: string
      phone: string | null
    }
    claimedAt: Date | null
  }>
}

interface Class {
  id: string
  name: string
}

interface ClaimStatusDashboardProps {
  students: Student[]
  classes: Class[]
  stats: {
    claimed: number
    notClaimed: number
    pending: number
    total: number
  }
}

export function ClaimStatusDashboard({ students, classes, stats }: ClaimStatusDashboardProps) {
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [regeneratingCodes, setRegeneratingCodes] = useState<Set<string>>(new Set())

  // Get unique teachers from classes
  const teachers = useMemo(() => {
    const teacherMap = new Map<string, { id: string; name: string }>()
    students.forEach(student => {
      student.classes.forEach(cls => {
        if (cls.teacher) {
          teacherMap.set(cls.teacher.id, {
            id: cls.teacher.id,
            name: cls.teacher.name
          })
        }
      })
    })
    return Array.from(teacherMap.values())
  }, [students])

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

      // Filter by teacher
      if (selectedTeacher !== 'all') {
        const hasTeacher = student.classes.some(c => c.teacher?.id === selectedTeacher)
        if (!hasTeacher) return false
      }

      return true
    })
  }, [students, selectedClass, selectedStatus, selectedTeacher])

  const getStatusBadge = (status: Student['claimStatus']) => {
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
            Pending
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

  const handleGeneratePDF = async (filter?: string, classId?: string, studentId?: string) => {
    setIsGeneratingPDF(true)
    try {
      const response = await fetch('/api/claims/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: filter || selectedStatus !== 'all' ? selectedStatus : undefined,
          classId: classId || (selectedClass !== 'all' ? selectedClass : undefined),
          studentId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate PDF')
      }

      // Download PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `claim-sheets-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Claim sheets PDF generated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleRegenerateCode = async (studentId: string) => {
    setRegeneratingCodes(prev => new Set(prev).add(studentId))
    try {
      const response = await fetch('/api/claims/regenerate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate code')
      }

      toast.success('Claim code regenerated successfully')
      // Reload page to show new code
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate code')
    } finally {
      setRegeneratingCodes(prev => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    }
  }

  const handleCopyClaimLink = (claimCode: string) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/parent/signup?code=${claimCode}`
    navigator.clipboard.writeText(link)
    toast.success('Claim link copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Parent Claim Status</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Track which students have been claimed by parents and manage claim codes
        </p>
      </div>

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

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => handleGeneratePDF()}
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
              >
                {isGeneratingPDF ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate All Sheets
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleGeneratePDF('not-claimed')}
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Not Claimed Only
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div>
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                Teacher
              </label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Claim Status</TableHead>
                  <TableHead>Parent Email</TableHead>
                  <TableHead>Claim Code</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
                      No students found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>
                        {student.classes.map(c => c.name).join(', ') || 'No class'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(student.claimStatus)}
                      </TableCell>
                      <TableCell>
                        {student.claimedBy?.email || student.parentLinks[0]?.parent.email || '-'}
                      </TableCell>
                      <TableCell>
                        {student.claimCode ? (
                          <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded font-mono">
                            {student.claimCode}
                          </code>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-sm">No code</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {student.claimCode && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGeneratePDF(undefined, undefined, student.id)}
                                title="Print claim sheet"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyClaimLink(student.claimCode!)}
                                title="Copy claim link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {student.claimStatus !== 'CLAIMED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerateCode(student.id)}
                              disabled={regeneratingCodes.has(student.id)}
                              title="Regenerate claim code"
                            >
                              {regeneratingCodes.has(student.id) ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

