'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Download, Eye, CreditCard, Filter, X, Calendar, Receipt, FileText } from 'lucide-react'
import { isDemoMode } from '@/lib/demo-mode'
import { format } from 'date-fns'
import { InvoiceDetailModal } from '@/components/invoice-detail-modal'
import { RecordPaymentModal } from '@/components/record-payment-modal'

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  parentName: string
  parentEmail: string
  amount: number
  currency: string
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE'
  dueDate: string
  paidDate?: string
  createdAt: string
  updatedAt: string
  student?: {
    id: string
    hasStripeAutoPayment?: boolean
  }
  class?: {
    id: string
    name: string
  }
}

interface PaymentRecord {
  id: string
  invoiceNumber: string
  studentName: string
  parentName: string
  amount: number
  currency: string
  paymentMethod: string
  paymentDate: string
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING'
  transactionId?: string
  notes?: string
}

interface InvoicesPageClientProps {
  initialInvoices?: Invoice[]
}

export function InvoicesPageClient({ initialInvoices = [] }: InvoicesPageClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices)
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [filteredPaymentRecords, setFilteredPaymentRecords] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    // Default to current month
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
  })
  const [classFilter, setClassFilter] = useState<string>('all')
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([])
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('invoices')

  useEffect(() => {
    if (initialInvoices.length === 0) {
      fetchInvoices()
    }
  }, [])

  // Filter invoices - only show current month data (no other filters)
  useEffect(() => {
    let filtered = [...invoices]

    // Only apply month filter - show all invoices for the current month
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-')
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt)
        return invoiceDate.getFullYear() === parseInt(year) && 
               invoiceDate.getMonth() === parseInt(month) - 1
      })
    }

    setFilteredInvoices(filtered)
  }, [invoices, monthFilter])

  // Filter payment records based on selected filters
  useEffect(() => {
    let filtered = [...paymentRecords]

    // Status filter for payment records
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter)
    }

    // Payment method filter
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(record => record.paymentMethod === paymentTypeFilter)
    }

    // Month filter for payment records
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-')
      filtered = filtered.filter(record => {
        const paymentDate = new Date(record.paymentDate)
        return paymentDate.getFullYear() === parseInt(year) && 
               paymentDate.getMonth() === parseInt(month) - 1
      })
    }

    // Class filter for payment records (based on student name matching)
    if (classFilter !== 'all') {
      const selectedClass = classes.find(c => c.id === classFilter)
      if (selectedClass) {
        // This is a simplified filter - in a real app, you'd have proper class-student relationships
        filtered = filtered.filter(record => {
          // For demo purposes, we'll filter based on student names that might be in certain classes
          // In a real implementation, you'd have proper class-student relationships
          return true // For now, show all records when a class is selected
        })
      }
    }

    setFilteredPaymentRecords(filtered)
  }, [paymentRecords, statusFilter, paymentTypeFilter, monthFilter, classFilter, classes])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      // Always use real API data
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        // Transform API data to match Invoice interface
        const transformed = data.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`,
          studentName: `${inv.student?.firstName || ''} ${inv.student?.lastName || ''}`.trim(),
          parentName: inv.student?.primaryParent?.name || '',
          parentEmail: inv.student?.primaryParent?.email || '',
          amount: Number(inv.amountP || 0) / 100,
          currency: inv.currency || 'GBP',
          status: inv.status,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          paidDate: inv.paidAt ? new Date(inv.paidAt).toISOString().split('T')[0] : undefined,
          createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '',
          updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString().split('T')[0] : '',
          student: {
            id: inv.student?.id || '',
            hasStripeAutoPayment: inv.student?.hasStripeAutoPayment || false
          },
          class: {
            id: inv.classId || '',
            name: inv.class?.name || 'No Class'
          }
        }))
        setInvoices(transformed)
        
        // Get payment records
        const paymentsResponse = await fetch('/api/payments')
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          // Transform payment data
          const paymentRecords: PaymentRecord[] = paymentsData.map((payment: any) => ({
            id: payment.id,
            invoiceNumber: payment.invoice?.invoiceNumber || '',
            studentName: payment.invoice?.student ? `${payment.invoice.student.firstName} ${payment.invoice.student.lastName}` : '',
            amount: Number(payment.amountP || 0) / 100,
            currency: payment.currency || 'GBP',
            status: payment.status,
            method: payment.method || 'CARD',
            date: payment.createdAt ? new Date(payment.createdAt).toISOString().split('T')[0] : '',
            invoiceId: payment.invoiceId || ''
          }))
          setPaymentRecords(paymentRecords)
        }
      } else {
        console.error('Failed to fetch invoices')
        setInvoices([])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  // Legacy demo mode check removed - always use real API data
  if (false) {
        // Demo data
        const demoInvoices: Invoice[] = [
          {
            id: 'demo-invoice-1',
            invoiceNumber: 'INV-2025-001',
            studentName: 'Ahmed Hassan',
            parentName: 'Mohammed Hassan',
            parentEmail: 'mohammed.hassan@example.com',
            amount: 50.00,
            currency: 'GBP',
            status: 'PAID',
            dueDate: '2025-01-15',
            paidDate: '2025-01-05',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-05',
            student: {
              id: 'student-1',
              hasStripeAutoPayment: true
            },
            class: {
              id: 'class-1',
              name: 'Quran Recitation - Level 1'
            }
          },
          {
            id: 'demo-invoice-2',
            invoiceNumber: 'INV-2025-002',
            studentName: 'Fatima Ali',
            parentName: 'Aisha Ali',
            parentEmail: 'aisha.ali@example.com',
            amount: 50.00,
            currency: 'GBP',
            status: 'PENDING',
            dueDate: '2025-01-20',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
            student: {
              id: 'student-2',
              hasStripeAutoPayment: false
            },
            class: {
              id: 'class-2',
              name: 'Islamic Studies - Intermediate'
            }
          },
          {
            id: 'demo-invoice-3',
            invoiceNumber: 'INV-2025-003',
            studentName: 'Yusuf Patel',
            parentName: 'Priya Patel',
            parentEmail: 'priya.patel@example.com',
            amount: 25.00,
            currency: 'GBP',
            status: 'OVERDUE',
            dueDate: '2025-01-10',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
            student: {
              id: 'student-3',
              hasStripeAutoPayment: false
            },
            class: {
              id: 'class-1',
              name: 'Quran Recitation - Level 1'
            }
          },
          {
            id: 'demo-invoice-4',
            invoiceNumber: 'INV-2024-001',
            studentName: 'Ahmed Hassan',
            parentName: 'Mohammed Hassan',
            parentEmail: 'mohammed.hassan@example.com',
            amount: 50.00,
            currency: 'GBP',
            status: 'PAID',
            dueDate: '2024-12-01',
            paidDate: '2024-11-28',
            createdAt: '2024-11-01',
            updatedAt: '2024-11-28',
            student: {
              id: 'student-1',
              hasStripeAutoPayment: false
            },
            class: {
              id: 'class-1',
              name: 'Quran Recitation - Level 1'
            }
          }
        ]
        setInvoices(demoInvoices)
        
        // Demo payment records
        const demoPaymentRecords: PaymentRecord[] = [
          {
            id: 'payment-1',
            invoiceNumber: 'INV-2025-001',
            studentName: 'Ahmed Hassan',
            parentName: 'Mohammed Hassan',
            amount: 50.00,
            currency: 'GBP',
            paymentMethod: 'Credit Card',
            paymentDate: '2025-01-05',
            status: 'SUCCEEDED',
            transactionId: 'txn_123456789',
            notes: 'Payment processed successfully'
          },
          {
            id: 'payment-2',
            invoiceNumber: 'INV-2025-002',
            studentName: 'Fatima Ali',
            parentName: 'Aisha Ali',
            amount: 50.00,
            currency: 'GBP',
            paymentMethod: 'Bank Transfer',
            paymentDate: '2025-01-10',
            status: 'SUCCEEDED',
            transactionId: 'txn_987654321',
            notes: 'Bank transfer received'
          },
          {
            id: 'payment-3',
            invoiceNumber: 'INV-2025-003',
            studentName: 'Yusuf Patel',
            parentName: 'Priya Patel',
            amount: 25.00,
            currency: 'GBP',
            paymentMethod: 'Cash',
            paymentDate: '2025-01-15',
            status: 'SUCCEEDED',
            notes: 'Cash payment received at office'
          },
          {
            id: 'payment-4',
            invoiceNumber: 'INV-2025-004',
            studentName: 'Amina Khan',
            parentName: 'Moulana Omar',
            amount: 50.00,
            currency: 'GBP',
            paymentMethod: 'Credit Card',
            paymentDate: '2025-01-20',
            status: 'FAILED',
            transactionId: 'txn_failed_123',
            notes: 'Card declined - insufficient funds'
          },
          {
            id: 'payment-5',
            invoiceNumber: 'INV-2024-001',
            studentName: 'Ahmed Hassan',
            parentName: 'Mohammed Hassan',
            amount: 50.00,
            currency: 'GBP',
            paymentMethod: 'Credit Card',
            paymentDate: '2024-12-01',
            status: 'SUCCEEDED',
            transactionId: 'txn_123456789',
            notes: 'Payment processed successfully'
          },
          {
            id: 'payment-6',
            invoiceNumber: 'INV-2024-002',
            studentName: 'Fatima Ali',
            parentName: 'Aisha Ali',
            amount: 50.00,
            currency: 'GBP',
            paymentMethod: 'Bank Transfer',
            paymentDate: '2024-11-28',
            status: 'SUCCEEDED',
            transactionId: 'txn_987654321',
            notes: 'Bank transfer received'
          }
        ]
        setPaymentRecords(demoPaymentRecords)
        
        // Demo classes
        const demoClasses = [
          { id: 'class-1', name: 'Quran Recitation - Level 1' },
          { id: 'class-2', name: 'Islamic Studies - Intermediate' },
          { id: 'class-3', name: 'Arabic Language - Beginner' }
        ]
        setClasses(demoClasses)
      } else {
        const response = await fetch('/api/payments')
        const data = await response.json()
        setInvoices(data)
        
        // Fetch classes
        const classesResponse = await fetch('/api/classes')
        const classesData = await classesResponse.json()
        setClasses(classesData)
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleViewInvoice = async (invoiceId: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
      setIsModalOpen(true)
    }
  }

  const handleRecordPayment = async (invoiceId: string) => {
    setPaymentInvoiceId(invoiceId)
    setIsPaymentModalOpen(true)
  }

  const handleRecordPaymentSubmit = async (data: { amount: number; method: string; notes?: string }) => {
    try {
      const response = await fetch(`/api/payments/${paymentInvoiceId}/record-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountP: Math.round(data.amount * 100), // Convert to pence
          method: data.method,
          notes: data.notes
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('Payment recorded successfully!')
        // Refresh the invoices list
        await fetchInvoices()
        setIsPaymentModalOpen(false)
        setPaymentInvoiceId(null)
      } else {
        alert('Failed to record payment: ' + result.error)
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedInvoice(null)
  }

  const handleExportCSV = () => {
    // Create CSV headers
    const headers = [
      'Invoice Number',
      'Student Name',
      'Parent Name',
      'Parent Email',
      'Amount',
      'Status',
      'Due Date',
      'Paid Date',
      'Created Date',
      'Payment Type'
    ]

    // Create CSV rows from filtered invoices
    const csvRows = filteredInvoices.map(invoice => [
      invoice.invoiceNumber,
      invoice.studentName,
      invoice.parentName,
      invoice.parentEmail,
      `£${invoice.amount.toFixed(2)}`,
      invoice.status,
      format(new Date(invoice.dueDate), 'dd/MM/yyyy'),
      invoice.paidDate ? format(new Date(invoice.paidDate), 'dd/MM/yyyy') : '',
      format(new Date(invoice.createdAt), 'dd/MM/yyyy'),
      invoice.student?.hasStripeAutoPayment ? 'Auto Payment' : 'Manual Payment'
    ])

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename with current date and filter info
    const now = new Date()
    const dateStr = format(now, 'yyyy-MM-dd')
    let filename = `payments-export-${dateStr}`
    
    // Add filter info to filename
    if (statusFilter !== 'all') {
      filename += `-${statusFilter.toLowerCase()}`
    }
    if (paymentTypeFilter !== 'all') {
      filename += `-${paymentTypeFilter}`
    }
    if (monthFilter !== 'all') {
      filename += `-${monthFilter}`
    }
    if (classFilter !== 'all') {
      const className = classes.find(c => c.id === classFilter)?.name || 'class'
      filename += `-${className.replace(/\s+/g, '-').toLowerCase()}`
    }
    
    filename += '.csv'
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      DRAFT: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${variants[status as keyof typeof variants]}`}>
        {status}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      SUCCEEDED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${variants[status as keyof typeof variants]}`}>
        {status}
      </span>
    )
  }

  // Helper function to get month display text
  const getMonthDisplayText = (monthFilter: string) => {
    if (monthFilter === 'all') {
      return 'All Months'
    }
    const [year, month] = monthFilter.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return format(date, 'MMMM yyyy')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student payments and invoices.
          </p>
          {/* Month Indicator */}
          <div className="mt-2 flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              Viewing: {getMonthDisplayText(monthFilter)}
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <Receipt className="h-4 w-4" />
            <span>Payment Records</span>
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.studentName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invoice.parentName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-4">
                          <button 
                            onClick={() => handleViewInvoice(invoice.id)}
                            className="text-gray-600 hover:text-gray-900 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          {invoice.status !== 'PAID' && !invoice.student?.hasStripeAutoPayment && (
                            <button 
                              onClick={() => handleRecordPayment(invoice.id)}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Record Payment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        </TabsContent>

        {/* Payment Records Tab */}
        <TabsContent value="payments" className="space-y-6">
          {/* Filters for Payment Records */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              {/* Status Filter Buttons for Payment Records */}
              <div className="flex space-x-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'SUCCEEDED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('SUCCEEDED')}
                  className={statusFilter === 'SUCCEEDED' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50'}
                >
                  Succeeded
                </Button>
                <Button
                  variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('FAILED')}
                  className={statusFilter === 'FAILED' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50'}
                >
                  Failed
                </Button>
                <Button
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('PENDING')}
                  className={statusFilter === 'PENDING' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'}
                >
                  Pending
                </Button>
              </div>

              {/* Payment Method Filter */}
              <div className="flex space-x-2">
                <Button
                  variant={paymentTypeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentTypeFilter('all')}
                >
                  All Methods
                </Button>
                <Button
                  variant={paymentTypeFilter === 'Credit Card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentTypeFilter('Credit Card')}
                >
                  Credit Card
                </Button>
                <Button
                  variant={paymentTypeFilter === 'Bank Transfer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentTypeFilter('Bank Transfer')}
                >
                  Bank Transfer
                </Button>
                <Button
                  variant={paymentTypeFilter === 'Cash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentTypeFilter('Cash')}
                >
                  Cash
                </Button>
              </div>

              {/* Month Filter */}
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="2025-01">January 2025</SelectItem>
                  <SelectItem value="2024-12">December 2024</SelectItem>
                  <SelectItem value="2024-11">November 2024</SelectItem>
                  <SelectItem value="2024-10">October 2024</SelectItem>
                  <SelectItem value="2024-09">September 2024</SelectItem>
                </SelectContent>
              </Select>

              {/* Class Filter */}
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setPaymentTypeFilter('all')
                  setMonthFilter('all')
                  setClassFilter('all')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Payment Records</h3>
              <p className="mt-1 text-sm text-gray-500">
                View all payment transactions and records.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPaymentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                        No payment records found for the selected month.
                      </td>
                    </tr>
                  ) : (
                    filteredPaymentRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                          <div className="text-sm text-gray-500">{record.parentName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          £{record.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(record.paymentDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.transactionId || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRecordPayment={handleRecordPayment}
      />

      {paymentInvoiceId && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setPaymentInvoiceId(null)
          }}
          invoiceId={paymentInvoiceId}
          invoiceAmount={filteredInvoices.find(inv => inv.id === paymentInvoiceId)?.amount || 0}
          onRecordPayment={handleRecordPaymentSubmit}
        />
      )}
    </div>
  )
}
