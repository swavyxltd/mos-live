'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Users,
  ArrowLeft,
  Coins,
  Check,
  Loader2,
  Edit
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { StudentDetailModal } from '@/components/student-detail-modal'

interface Student {
  id: string
  firstName: string
  lastName: string
  parentName: string
  parentEmail: string
  parentPhone: string
}

interface PaymentRecord {
  id: string
  studentId: string
  studentName: string
  month: string
  amountP: number
  method: string | null
  status: string
  paidAt: string | null
  notes: string | null
  reference: string | null
  parentName: string
  parentEmail: string
  parentPhone: string
}

interface ClassPaymentData {
  id: string
  name: string
  teacher: string
  studentCount: number
  paid: number
  late: number
  overdue: number
  students: Student[]
  paymentRecords: PaymentRecord[]
}

interface PaymentsPageClientProps {
  classes: ClassPaymentData[]
}

export function PaymentsPageClient({ classes }: PaymentsPageClientProps) {
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // Get unique months from all payment records across all classes
  const getAllUniqueMonthsFromProps = () => {
    const allMonths = new Set<string>()
    classes.forEach(cls => {
      cls.paymentRecords.forEach(record => {
        allMonths.add(record.month)
      })
    })
    return Array.from(allMonths).sort().reverse()
  }

  // Get initial month filter - use current month if available, otherwise use first available month
  const getInitialMonth = () => {
    const currentMonth = getCurrentMonth()
    const availableMonths = getAllUniqueMonthsFromProps()
    if (availableMonths.includes(currentMonth)) {
      return currentMonth
    }
    return availableMonths.length > 0 ? availableMonths[0] : 'all'
  }

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [localClasses, setLocalClasses] = useState(classes)
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState<string>('')
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const initialMonth = getInitialMonth()
  const [monthFilter, setMonthFilter] = useState<string>(initialMonth)
  const [overviewMonthFilter, setOverviewMonthFilter] = useState<string>(initialMonth)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)

  const selectedClass = selectedClassId 
    ? localClasses.find(c => c.id === selectedClassId) 
    : null

  // Get unique months from all payment records across all classes
  const getAllUniqueMonths = () => {
    const allMonths = new Set<string>()
    localClasses.forEach(cls => {
      cls.paymentRecords.forEach(record => {
        allMonths.add(record.month)
      })
    })
    return Array.from(allMonths).sort().reverse()
  }

  // Get unique months from payment records for selected class
  const getUniqueMonths = () => {
    if (!selectedClass) return []
    const months = selectedClass.paymentRecords.map(r => r.month)
    const unique = Array.from(new Set(months)).sort().reverse()
    return unique
  }

  // Filter classes by month for overview stats
  const getFilteredClassesForOverview = () => {
    if (overviewMonthFilter === 'all') return localClasses
    
    return localClasses.map(cls => {
      const filteredRecords = cls.paymentRecords.filter(r => r.month === overviewMonthFilter)
      
      // Recalculate stats based on filtered records
      const paid = filteredRecords.filter(r => r.status === 'PAID').length
      const late = filteredRecords.filter(r => r.status === 'LATE').length
      const overdue = filteredRecords.filter(r => r.status === 'OVERDUE').length
      
      return {
        ...cls,
        paid,
        late,
        overdue,
        paymentRecords: filteredRecords
      }
    })
  }

  // Filter payment records by month
  const getFilteredRecords = () => {
    if (!selectedClass) return []
    if (monthFilter === 'all') return selectedClass.paymentRecords
    return selectedClass.paymentRecords.filter(r => r.month === monthFilter)
  }

  const handleClassClick = (classId: string) => {
    setSelectedClassId(classId)
  }

  const handleBackToOverview = () => {
    setSelectedClassId(null)
  }

  const handleMarkAsPaid = (record: PaymentRecord) => {
    setSelectedRecord(record)
    setPaymentMethod(record.method || 'CASH')
    setPaymentReference(record.reference || '')
    setMarkPaidModalOpen(true)
  }

  const handleEdit = (record: PaymentRecord) => {
    setSelectedRecord(record)
    setPaymentReference(record.reference || '')
    setEditingNotes(record.notes || '')
    setEditModalOpen(true)
  }

  const handleStudentClick = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}`)
      if (response.ok) {
        const fullStudent = await response.json()
        // Transform to match StudentDetailModal format
        const detailStudent = {
          ...fullStudent,
          name: `${fullStudent.firstName} ${fullStudent.lastName}`,
          class: fullStudent.class || fullStudent.classes?.[0]?.name || 'N/A',
          teacher: fullStudent.teacher || 'N/A',
          overallAttendance: fullStudent.attendanceRate || 0,
          weeklyAttendance: [], // Would need to fetch from attendance API
          recentTrend: 'stable' as const
        }
        setSelectedStudent(detailStudent)
        setIsStudentModalOpen(true)
      } else {
        toast.error('Failed to load student details')
      }
    } catch (error) {
      toast.error('Failed to load student details')
    }
  }

  const handleConfirmMarkAsPaid = async () => {
    if (!selectedRecord) return

    setIsMarkingPaid(true)
    try {
      const response = await fetch('/api/payments/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          status: 'PAID',
          method: paymentMethod,
          reference: paymentReference || undefined,
          paidAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mark payment as paid')
      }

      // Update local state
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      setLocalClasses(localClasses.map(cls => {
        if (cls.id === selectedClassId) {
          const updatedRecords = cls.paymentRecords.map(rec => 
            rec.id === selectedRecord.id
              ? { ...rec, status: 'PAID', method: paymentMethod, reference: paymentReference || rec.reference, paidAt: new Date().toISOString() }
              : rec
          )
          
          // Recalculate stats
          const paid = updatedRecords.filter(r => r.status === 'PAID').length
          const late = updatedRecords.filter(r => r.status === 'LATE').length
          const overdue = updatedRecords.filter(r => r.status === 'PENDING' && r.month < currentMonth).length
          
          return {
            ...cls,
            paymentRecords: updatedRecords,
            paid,
            late,
            overdue
          }
        }
        return cls
      }))

      toast.success('Payment marked as paid successfully')
      setMarkPaidModalOpen(false)
      setSelectedRecord(null)
      setPaymentReference('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark payment as paid')
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedRecord) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/payments/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          reference: paymentReference || undefined,
          notes: editingNotes || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment record')
      }

      // Update local state
      setLocalClasses(localClasses.map(cls => {
        if (cls.id === selectedClassId) {
          return {
            ...cls,
            paymentRecords: cls.paymentRecords.map(rec => 
              rec.id === selectedRecord.id
                ? { ...rec, reference: paymentReference || rec.reference, notes: editingNotes || rec.notes }
                : rec
            )
          }
        }
        return cls
      }))

      toast.success('Payment record updated successfully')
      setEditModalOpen(false)
      setSelectedRecord(null)
      setPaymentReference('')
      setEditingNotes('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment record')
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusBoxClasses = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 border-green-200'
      case 'LATE':
        return 'bg-yellow-50 border-yellow-200'
      case 'OVERDUE':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        )
      case 'LATE':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Late
          </Badge>
        )
      case 'OVERDUE':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  // Overview: Show class tiles
  if (!selectedClassId) {
    const filteredClasses = getFilteredClassesForOverview()
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Payments</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage payments for students by class. Click on a class to view payment records.
            </p>
          </div>
          
          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="overview-month-filter" className="text-sm text-gray-600 whitespace-nowrap">
              Filter by month:
            </Label>
            <Select value={overviewMonthFilter} onValueChange={setOverviewMonthFilter}>
              <SelectTrigger id="overview-month-filter" className="w-[180px] h-9">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {getAllUniqueMonths().map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Class Payment Tiles */}
        {filteredClasses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
                <p className="text-sm text-gray-500">
                  Create classes to start managing payments.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredClasses.map((classItem) => (
              <Card 
                key={classItem.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleClassClick(classItem.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                        {classItem.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {classItem.teacher}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Payment Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-lg font-semibold text-green-700">
                        {classItem.paid}
                      </div>
                      <div className="text-xs text-green-600">Paid</div>
                    </div>
                    
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="text-lg font-semibold text-yellow-700">
                        {classItem.late}
                      </div>
                      <div className="text-xs text-yellow-600">Late</div>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-center mb-1">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-lg font-semibold text-red-700">
                        {classItem.overdue}
                      </div>
                      <div className="text-xs text-red-600">Overdue</div>
                    </div>
                  </div>

                  {/* Quick Summary */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{classItem.studentCount} students</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {classItem.paymentRecords.length} records
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Detailed View: Show class payment records
  if (!selectedClass) return null

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToOverview}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classes
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{selectedClass.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {selectedClass.teacher} • {selectedClass.studentCount} students
          </p>
        </div>
      </div>

      {/* Payment Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Paid"
          value={selectedClass.paid}
          description="Completed payments"
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          className="border-l-4 border-l-green-500 bg-green-50/30"
        />
        <StatCard
          title="Late"
          value={selectedClass.late}
          description="Overdue payments"
          icon={<Clock className="h-4 w-4 text-yellow-600" />}
          className="border-l-4 border-l-yellow-500 bg-yellow-50/30"
        />
        <StatCard
          title="Overdue"
          value={selectedClass.overdue}
          description="Past due amounts"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          className="border-l-4 border-l-red-500 bg-red-50/30"
        />
      </div>

      {/* Payment Records Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Payment Records</CardTitle>
            {selectedClass.paymentRecords.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="month-filter" className="text-sm text-gray-600">Filter by month:</Label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger id="month-filter" className="w-[180px] h-9">
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {getUniqueMonths().map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonth(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedClass.paymentRecords.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment records found for this class</p>
            </div>
          ) : getFilteredRecords().length === 0 ? (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment records found for selected month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Student</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Parent</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700 px-6 py-4">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Method</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-6 py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredRecords().map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50/30 border-b border-gray-100 transition-colors">
                      <TableCell className="font-medium text-gray-900 px-6 py-4 text-left">
                        <button
                          onClick={() => handleStudentClick(record.studentId)}
                          className="text-gray-900 hover:text-gray-700 hover:underline cursor-pointer transition-colors text-left"
                        >
                          {record.studentName}
                        </button>
                      </TableCell>
                      <TableCell className="text-gray-600 px-6 py-4">
                        {record.parentName || '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900 px-6 py-4">
                        {formatCurrency(record.amountP)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">
                        {getMethodLabel(record.method)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusBadge(record.status)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 w-full">
                          {record.status === 'PAID' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 px-3 text-xs font-medium whitespace-nowrap flex-shrink-0"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleMarkAsPaid(record)}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs font-medium whitespace-nowrap flex-shrink-0"
                            >
                              <Check className="h-3.5 w-3.5 mr-1.5" />
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

      {/* Edit Payment Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedRecord(null)
          setPaymentReference('')
          setEditingNotes('')
        }}
        title={`Edit Payment Record`}
      >
        <div className="space-y-5">
          <div className={`border rounded-lg p-4 ${selectedRecord ? getStatusBoxClasses(selectedRecord.status) : 'bg-gray-50 border-gray-200'}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Student</span>
                <span className="text-sm font-semibold text-gray-900">{selectedRecord?.studentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Month</span>
                <span className="text-sm font-semibold text-gray-900">{selectedRecord && formatMonth(selectedRecord.month)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Amount</span>
                <span className="text-sm font-semibold text-green-700">{selectedRecord && formatCurrency(selectedRecord.amountP)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <span>{selectedRecord && getStatusBadge(selectedRecord.status)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editReference" className="text-sm font-semibold text-gray-700">
              Payment Reference <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="editReference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Receipt #12345, Transaction ID"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editNotes" className="text-sm font-semibold text-gray-700">
              Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="editNotes"
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Add any notes about this payment"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditModalOpen(false)
                setSelectedRecord(null)
                setPaymentReference('')
                setEditingNotes('')
              }}
              className="h-10 px-4"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={isSaving}
              className="h-10 px-6 font-semibold shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={markPaidModalOpen}
        onClose={() => {
          setMarkPaidModalOpen(false)
          setSelectedRecord(null)
          setPaymentReference('')
        }}
        title={`Mark Payment as Paid`}
      >
        <div className="space-y-5">
          <div className={`border rounded-lg p-4 ${selectedRecord ? getStatusBoxClasses(selectedRecord.status) : 'bg-gray-50 border-gray-200'}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Student</span>
                <span className="text-sm font-semibold text-gray-900">{selectedRecord?.studentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Month</span>
                <span className="text-sm font-semibold text-gray-900">{selectedRecord && formatMonth(selectedRecord.month)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Amount</span>
                <span className="text-sm font-semibold text-green-700">{selectedRecord && formatCurrency(selectedRecord.amountP)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-sm font-semibold text-gray-700">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">💵 Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Select how the payment was received
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentReference" className="text-sm font-semibold text-gray-700">
              Payment Reference <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="paymentReference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Receipt #12345, Transaction ID"
              className="h-10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add a reference number for record keeping
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => {
                setMarkPaidModalOpen(false)
                setSelectedRecord(null)
                setPaymentReference('')
              }}
              className="h-10 px-4"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmMarkAsPaid} 
              disabled={isMarkingPaid}
              className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 font-semibold shadow-sm"
            >
              {isMarkingPaid ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Paid
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false)
          setSelectedStudent(null)
        }}
        classes={selectedClass ? [{ id: selectedClass.id, name: selectedClass.name }] : []}
      />
    </div>
  )
}

