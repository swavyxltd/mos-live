'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Download, Eye, CreditCard, Filter, X } from 'lucide-react'
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

interface InvoicesPageClientProps {
  initialInvoices?: Invoice[]
}

export function InvoicesPageClient({ initialInvoices = [] }: InvoicesPageClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    if (initialInvoices.length === 0) {
      fetchInvoices()
    }
  }, [])

  // Filter invoices based on selected filters
  useEffect(() => {
    let filtered = [...invoices]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    // Payment type filter
    if (paymentTypeFilter === 'auto') {
      filtered = filtered.filter(invoice => invoice.student?.hasStripeAutoPayment)
    } else if (paymentTypeFilter === 'manual') {
      filtered = filtered.filter(invoice => !invoice.student?.hasStripeAutoPayment)
    }

    // Month filter
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-')
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.createdAt)
        return invoiceDate.getFullYear() === parseInt(year) && 
               invoiceDate.getMonth() === parseInt(month) - 1
      })
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.class?.id === classFilter)
    }

    setFilteredInvoices(filtered)
  }, [invoices, statusFilter, paymentTypeFilter, monthFilter, classFilter])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      if (isDemoMode()) {
        // Demo data
        const demoInvoices: Invoice[] = [
          {
            id: 'demo-invoice-1',
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
          },
          {
            id: 'demo-invoice-2',
            invoiceNumber: 'INV-2024-002',
            studentName: 'Fatima Ali',
            parentName: 'Aisha Ali',
            parentEmail: 'aisha.ali@example.com',
            amount: 75.00,
            currency: 'GBP',
            status: 'OVERDUE',
            dueDate: '2024-12-01',
            createdAt: '2024-11-01',
            updatedAt: '2024-12-06',
            student: {
              id: 'student-2',
              hasStripeAutoPayment: true
            },
            class: {
              id: 'class-2',
              name: 'Islamic Studies - Intermediate'
            }
          },
          {
            id: 'demo-invoice-3',
            invoiceNumber: 'INV-2024-003',
            studentName: 'Yusuf Patel',
            parentName: 'Priya Patel',
            parentEmail: 'priya.patel@example.com',
            amount: 25.00,
            currency: 'GBP',
            status: 'PENDING',
            dueDate: '2024-12-15',
            createdAt: '2024-12-01',
            updatedAt: '2024-12-01',
            student: {
              id: 'student-3',
              hasStripeAutoPayment: false
            },
            class: {
              id: 'class-1',
              name: 'Quran Recitation - Level 1'
            }
          }
        ]
        setInvoices(demoInvoices)
        
        // Demo classes
        const demoClasses = [
          { id: 'class-1', name: 'Quran Recitation - Level 1' },
          { id: 'class-2', name: 'Islamic Studies - Intermediate' },
          { id: 'class-3', name: 'Arabic Language - Beginner' }
        ]
        setClasses(demoClasses)
      } else {
        const response = await fetch('/api/invoices')
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

  const handleGenerateInvoices = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/invoices/generate-monthly', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh the invoices list
        await fetchInvoices()
        alert(`Generated ${result.created} new invoices`)
      } else {
        alert('Failed to generate invoices: ' + result.error)
      }
    } catch (error) {
      console.error('Error generating invoices:', error)
      alert('Failed to generate invoices')
    } finally {
      setGenerating(false)
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
      const response = await fetch(`/api/invoices/${paymentInvoiceId}/record-cash`, {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student invoices and payments.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={handleGenerateInvoices}
            disabled={generating}
          >
            <Plus className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Invoices'}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          {/* Status Filter Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'PAID' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('PAID')}
              className={statusFilter === 'PAID' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50'}
            >
              Paid
            </Button>
            <Button
              variant={statusFilter === 'OVERDUE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('OVERDUE')}
              className={statusFilter === 'OVERDUE' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50'}
            >
              Overdue
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

          {/* Payment Type Filter Buttons */}
          <div className="flex space-x-2">
            <Button
              variant={paymentTypeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentTypeFilter('all')}
            >
              All Payments
            </Button>
            <Button
              variant={paymentTypeFilter === 'auto' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentTypeFilter('auto')}
            >
              Auto Payments
            </Button>
            <Button
              variant={paymentTypeFilter === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentTypeFilter('manual')}
            >
              Manual Payments
            </Button>
          </div>

          {/* Month Filter */}
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
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
