'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Download, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  DollarSign,
  FileText,
  Edit,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { StudentDetailModal } from '@/components/student-detail-modal'

interface PaymentRecord {
  id: string
  student: {
    id: string
    firstName: string
    lastName: string
  }
  class: {
    id: string
    name: string
  }
  month: string
  amountP: number
  method: string | null
  status: string
  paidAt: string | null
  notes: string | null
  reference: string | null
  createdAt: string
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<PaymentRecord[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  // Filters
  const [monthFilter, setMonthFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Edit modal state
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNotes, setEditingNotes] = useState('')
  const [editingReference, setEditingReference] = useState('')
  const [markingPaid, setMarkingPaid] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  // Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [loadingStudent, setLoadingStudent] = useState(false)

  useEffect(() => {
    fetchRecords()
    fetchClasses()
  }, [])

  useEffect(() => {
    filterRecords()
  }, [records, monthFilter, classFilter, methodFilter, statusFilter])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/records')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch payment records:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to fetch payment records')
      }

      const data = await response.json()
      console.log('✅ Payment records fetched:', data.length, 'records')
      console.log('📊 Records data:', data)
      setRecords(data)
    } catch (error: any) {
      console.error('Error fetching payment records:', error)
      toast.error(error.message || 'Failed to load payment records')
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      } else {
        console.error('Failed to fetch classes:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
      toast.error('Failed to load classes')
    }
  }

  const filterRecords = () => {
    let filtered = records

    if (monthFilter) {
      filtered = filtered.filter(r => r.month === monthFilter)
    }
    if (classFilter) {
      filtered = filtered.filter(r => r.class.id === classFilter)
    }
    if (methodFilter) {
      filtered = filtered.filter(r => r.method === methodFilter)
    }
    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    setFilteredRecords(filtered)
  }

  const handleMarkPaid = async (record: PaymentRecord) => {
    if (!record.method || (record.method !== 'CASH' && record.method !== 'BANK_TRANSFER')) {
      toast.error('Can only mark cash or bank transfer payments as paid')
      return
    }

    setMarkingPaid(true)
    try {
      const response = await fetch('/api/payments/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          status: 'PAID',
          paidAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark payment as paid')
      }

      toast.success('Payment marked as paid. Confirmation email sent to parent.')
      await fetchRecords()
      setShowEditModal(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error marking payment as paid:', error)
      toast.error('Failed to update payment')
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!selectedRecord) return

    setSavingNotes(true)
    try {
      const response = await fetch('/api/payments/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          notes: editingNotes,
          reference: editingReference
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update notes')
      }

      toast.success('Notes updated')
      await fetchRecords()
      setShowEditModal(false)
      setSelectedRecord(null)
    } catch (error) {
      console.error('Error updating notes:', error)
      toast.error('Failed to update notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Month', 'Student', 'Class', 'Amount', 'Method', 'Status', 'Paid Date', 'Reference', 'Notes']
    const rows = filteredRecords.map(r => [
      r.month,
      `${r.student.firstName} ${r.student.lastName}`,
      r.class.name,
      `£${(r.amountP / 100).toFixed(2)}`,
      r.method || '',
      r.status,
      r.paidAt ? new Date(r.paidAt).toISOString().split('T')[0] : '',
      r.reference || '',
      r.notes || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-records-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'LATE':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Late</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case 'CASH':
        return 'Cash'
      case 'BANK_TRANSFER':
        return 'Bank Transfer'
      case 'STRIPE':
        return 'Card Payment'
      default:
        return 'Not set'
    }
  }

  const openEditModal = (record: PaymentRecord) => {
    setSelectedRecord(record)
    setEditingNotes(record.notes || '')
    setEditingReference(record.reference || '')
    setShowEditModal(true)
  }

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get unique months from records and format them
  const uniqueMonths = Array.from(new Set(records.map(r => r.month)))
    .sort()
    .reverse()
    .map(monthStr => {
      const [year, month] = monthStr.split('-')
      const monthNum = parseInt(month)
      return {
        value: monthStr,
        label: `${monthNames[monthNum - 1]} ${year}`
      }
    })

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const monthNum = parseInt(month)
    return `${monthNames[monthNum - 1]} ${year}`
  }

  const handleViewStudent = async (studentId: string) => {
    try {
      setLoadingStudent(true)
      const response = await fetch(`/api/students/${studentId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch student details')
      }
      const studentData = await response.json()
      
      // Format student data for the modal (matching the format used in students-list.tsx)
      const formattedStudent = {
        id: studentData.id,
        name: `${studentData.firstName} ${studentData.lastName}`,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toLocaleDateString() : '',
        age: studentData.age || 0,
        grade: studentData.grade || '',
        address: studentData.address || '',
        class: studentData.class || 'N/A',
        teacher: studentData.teacher || 'N/A',
        parentName: studentData.parentName || '',
        parentEmail: studentData.parentEmail || '',
        parentPhone: studentData.parentPhone || '',
        emergencyContact: studentData.emergencyContact || '',
        allergies: studentData.allergies || 'None',
        medicalNotes: studentData.medicalNotes || '',
        enrollmentDate: studentData.enrollmentDate 
          ? new Date(studentData.enrollmentDate).toLocaleDateString() 
          : new Date(studentData.createdAt).toLocaleDateString(),
        status: (studentData.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        isArchived: studentData.isArchived || false,
        archivedAt: studentData.archivedAt ? new Date(studentData.archivedAt).toLocaleDateString() : undefined,
        overallAttendance: studentData.attendanceRate || 0,
        weeklyAttendance: [] as Array<{
          day: string
          date: string
          status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
          time?: string
        }>,
        recentTrend: 'stable' as 'up' | 'down' | 'stable'
      }
      
      setSelectedStudent(formattedStudent)
      setShowStudentModal(true)
    } catch (error) {
      console.error('Error fetching student:', error)
      toast.error('Failed to load student details')
    } finally {
      setLoadingStudent(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Payments</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track and manage monthly payment records. Stripe payments are automatically marked as paid.
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="month" className="text-sm">Month</Label>
              <Select value={monthFilter || 'all'} onValueChange={(v) => setMonthFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {uniqueMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class" className="text-sm">Class</Label>
              <Select value={classFilter || 'all'} onValueChange={(v) => setClassFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="method" className="text-sm">Payment Method</Label>
              <Select value={methodFilter || 'all'} onValueChange={(v) => setMethodFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="STRIPE">Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({filteredRecords.length})</CardTitle>
          <CardDescription>
            View and manage monthly payment records. Stripe payments are automatically marked as paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{formatMonthDisplay(record.month)}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleViewStudent(record.student.id)}
                          className="text-left hover:text-blue-600 hover:underline transition-colors cursor-pointer font-medium"
                          disabled={loadingStudent}
                        >
                          {record.student.firstName} {record.student.lastName}
                        </button>
                      </TableCell>
                      <TableCell>{record.class.name}</TableCell>
                      <TableCell className="text-right font-medium">£{(record.amountP / 100).toFixed(2)}</TableCell>
                      <TableCell>{getMethodLabel(record.method)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.paidAt ? (() => {
                          try {
                            const date = new Date(record.paidAt)
                            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          } catch {
                            return '-'
                          }
                        })() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(record)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {record.status === 'PENDING' && 
                           (record.method === 'CASH' || record.method === 'BANK_TRANSFER') && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaid(record)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Payment Record</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedRecord(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {selectedRecord.student.firstName} {selectedRecord.student.lastName} - {selectedRecord.month}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reference">Payment Reference</Label>
                <Input
                  id="reference"
                  value={editingReference}
                  onChange={(e) => setEditingReference(e.target.value)}
                  placeholder="Enter payment reference number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  rows={4}
                  placeholder="Add any notes about this payment"
                  className="mt-1"
                />
              </div>
              {selectedRecord.status === 'PENDING' && 
               (selectedRecord.method === 'CASH' || selectedRecord.method === 'BANK_TRANSFER') && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => handleMarkPaid(selectedRecord)}
                    disabled={markingPaid}
                    className="w-full"
                  >
                    {markingPaid ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Marking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    A confirmation email will be sent to the parent
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedRecord(null)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateNotes}
                  disabled={savingNotes}
                  className="flex-1"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Save Notes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={showStudentModal}
        onClose={() => {
          setShowStudentModal(false)
          setSelectedStudent(null)
        }}
        classes={classes}
      />
    </div>
  )
}
