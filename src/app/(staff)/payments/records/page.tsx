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
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  Coins,
  Calendar,
  User,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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

export default function PaymentRecordsPage() {
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
      const params = new URLSearchParams()
      if (monthFilter) params.append('month', monthFilter)
      if (classFilter) params.append('classId', classFilter)
      if (methodFilter) params.append('method', methodFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/payments/records?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payment records')
      }

      const data = await response.json()
      setRecords(data)
    } catch (error) {
      toast.error('Failed to load payment records')
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
      }
    } catch (error) {
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

      toast.success('Payment marked as paid')
      
      // Trigger refresh event for finance dashboard
      window.dispatchEvent(new CustomEvent('refresh-dashboard'))
      
      await fetchRecords()
      setShowEditModal(false)
      setSelectedRecord(null)
    } catch (error) {
      toast.error('Failed to update payment')
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!selectedRecord) return

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
      toast.error('Failed to update notes')
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
      r.paidAt ? format(new Date(r.paidAt), 'yyyy-MM-dd') : '',
      r.reference || '',
      r.notes || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-records-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  // Get unique months for filter
  const uniqueMonths = Array.from(new Set(records.map(r => r.month))).sort().reverse()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Payment Records</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track and manage monthly payment records for all students.
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
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All months</SelectItem>
                  {uniqueMonths.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
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
            View and manage monthly payment records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payment records found</p>
            </div>
          ) : (
            <>
              {/* Mobile View - Card Layout */}
              <div className="block md:hidden space-y-3">
                {filteredRecords.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--foreground)] truncate">
                            {record.student.firstName} {record.student.lastName}
                          </h3>
                          <p className="text-lg font-bold text-[var(--foreground)] mt-1">
                            £{(record.amountP / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(record)}
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        {record.status === 'PENDING' && 
                         (record.method === 'CASH' || record.method === 'BANK_TRANSFER') && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(record)}
                            className="flex-1"
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.month}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {record.student.firstName} {record.student.lastName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {record.class.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">£{(record.amountP / 100).toFixed(2)}</TableCell>
                        <TableCell>{getMethodLabel(record.method)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.paidAt ? format(new Date(record.paidAt), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.reference || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(record)}
                            >
                              Edit
                            </Button>
                            {record.status === 'PENDING' && 
                             (record.method === 'CASH' || record.method === 'BANK_TRANSFER') && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkPaid(record)}
                              >
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Payment Record</CardTitle>
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
                  className="flex-1"
                >
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

