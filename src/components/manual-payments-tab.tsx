'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  CheckCircle, 
  Calendar,
  User,
  FileText,
  Loader2,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoiceNumber: string
  amount: number
  dueDate: string
  status: string
  student: {
    id: string
    firstName: string
    lastName: string
  }
  parent: {
    id: string
    name: string
    email: string
  }
  payments: Array<{
    id: string
    method: string
    amount: number
    status: string
    createdAt: string
    meta: any
  }>
}

interface PaymentForm {
  invoiceId: string
  paymentMethod: string
  amount: number
  notes: string
  paymentDate: string
}

export function ManualPaymentsTab() {
  const { data: session } = useSession()
  const { hasPermission } = useStaffPermissions(session?.user, 'ADMIN')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    invoiceId: '',
    paymentMethod: '',
    amount: 0,
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, statusFilter])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/payments/manual')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices)
      } else {
        throw new Error('Failed to fetch invoices')
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const filterInvoices = () => {
    let filtered = invoices

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(invoice => 
        invoice.student.firstName.toLowerCase().includes(term) ||
        invoice.student.lastName.toLowerCase().includes(term) ||
        invoice.parent.name?.toLowerCase().includes(term) ||
        invoice.invoiceNumber.toLowerCase().includes(term)
      )
    }

    setFilteredInvoices(filtered)
  }

  const handleRecordPayment = async () => {
    if (!hasPermission('manage_payments')) {
      toast.error('You do not have permission to record payments')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      })

      if (response.ok) {
        toast.success('Payment recorded successfully')
        setShowPaymentForm(false)
        setSelectedInvoice(null)
        setPaymentForm({
          invoiceId: '',
          paymentMethod: '',
          amount: 0,
          notes: '',
          paymentDate: new Date().toISOString().split('T')[0]
        })
        await fetchInvoices()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to record payment')
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const openPaymentForm = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentForm({
      invoiceId: invoice.id,
      paymentMethod: '',
      amount: invoice.amount,
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0]
    })
    setShowPaymentForm(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>
      case 'PAID':
        return <Badge variant="default">Paid</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Filter Invoices</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by student, parent, or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchInvoices}
                variant="outline"
                className="w-full"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invoices ({filteredInvoices.length})</CardTitle>
          <CardDescription>
            Click on an invoice to record a manual payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
                  onClick={() => openPaymentForm(invoice)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[var(--muted-foreground)]">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{invoice.student.firstName} {invoice.student.lastName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {format(new Date(invoice.dueDate), 'PPP')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Parent: {invoice.parent.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">£{(invoice.amount / 100).toFixed(2)}</p>
                      {hasPermission('manage_payments') && (
                        <Button size="sm" className="mt-2">
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)]">No pending invoices found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
              <CardDescription>
                Record a manual payment for {selectedInvoice.invoiceNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select 
                  value={paymentForm.paymentMethod} 
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>Bank Transfer</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount / 100}
                  onChange={(e) => setPaymentForm(prev => ({ 
                    ...prev, 
                    amount: Math.round(parseFloat(e.target.value) * 100) 
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleRecordPayment}
                  disabled={saving || !paymentForm.paymentMethod}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

