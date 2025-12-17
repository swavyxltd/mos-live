'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { 
  CreditCard, 
  Coins, 
  TrendingUp,
  Receipt,
  Settings,
  HelpCircle,
  CheckCircle,
  History,
  Users,
  AlertTriangle,
  Calendar,
  Building2,
  Banknote,
  Info
} from 'lucide-react'
import { PaymentModal } from '@/components/payment-modal'
import { TableSkeleton, Skeleton, StatCardSkeleton } from '@/components/loading/skeleton'

export default function ParentInvoicesPage() {
  const { status } = useSession()
  const [fees, setFees] = useState<any[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Ensure fees is always an array
  const safeFees = Array.isArray(fees) ? fees : []
  const [paymentSettings, setPaymentSettings] = useState({
    acceptsCard: false,
    acceptsCash: false,
    acceptsBankTransfer: false,
    cashPaymentEnabled: false,
    bankTransferEnabled: false,
    paymentInstructions: '',
    bankAccountName: null as string | null,
    bankSortCode: null as string | null,
    bankAccountNumber: null as string | null,
    billingDay: 1
  })
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('/api/settings/payment-methods')
      if (response.ok) {
        const settings = await response.json()
        setPaymentSettings({
          acceptsCard: settings.acceptsCard || false,
          acceptsCash: settings.acceptsCash || false,
          acceptsBankTransfer: settings.acceptsBankTransfer || false,
          cashPaymentEnabled: settings.cashPaymentEnabled || false,
          bankTransferEnabled: settings.bankTransferEnabled || false,
          paymentInstructions: settings.paymentInstructions || '',
          bankAccountName: settings.bankAccountName || null,
          bankSortCode: settings.bankSortCode || null,
          bankAccountNumber: settings.bankAccountNumber || null,
          billingDay: settings.billingDay || 1
        })
        
        // Auto-select if only one method is available
        // Use acceptsCash/acceptsBankTransfer as primary, fallback to cashPaymentEnabled/bankTransferEnabled
        const availableMethods = []
        if (settings.acceptsCash || settings.cashPaymentEnabled) availableMethods.push('CASH')
        if (settings.acceptsBankTransfer || settings.bankTransferEnabled) availableMethods.push('BANK_TRANSFER')
        
        // Also fetch parent's payment preferences
        const paymentResponse = await fetch('/api/settings/payment')
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json()
          const currentPreference = paymentData.preferredPaymentMethod
          
          // If only one method available, auto-select it
          if (availableMethods.length === 1 && !currentPreference) {
            const method = availableMethods[0] as 'CASH' | 'BANK_TRANSFER'
            setPreferredPaymentMethod(method)
            // Save it automatically
            await handlePaymentMethodChange(method)
          } else {
            setPreferredPaymentMethod(currentPreference)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    // Fetch real fees from API (always use real data)
      fetch('/api/payments')
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('Payments API error response:', JSON.stringify(errorData, null, 2))
            console.error('Response status:', res.status)
            throw new Error(errorData.error || errorData.details || `Failed to fetch payments: ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          // API returns array of invoices
          const invoices = Array.isArray(data) ? data : []
          
          // Transform invoices to match frontend format
          const transformedFees = invoices.map((invoice: any) => {
            // Get payment method and date from the most recent successful payment
            const latestPayment = invoice.payments && invoice.payments.length > 0
              ? invoice.payments[0] // Already sorted by createdAt desc
              : null
            
            // Determine status: if paid, show PAID, otherwise check if upcoming (48h before due)
            let displayStatus = invoice.status || 'PENDING'
            if (displayStatus === 'PAID') {
              displayStatus = 'PAID'
            } else if (invoice.dueDate) {
              const dueDate = new Date(invoice.dueDate)
              const now = new Date()
              const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
              
              if (dueDate <= fortyEightHoursFromNow && dueDate >= now) {
                displayStatus = 'UPCOMING'
              } else if (dueDate < now) {
                displayStatus = 'OVERDUE'
              }
            }
            
            return {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              student: invoice.studentName,
              description: `Monthly fees for ${invoice.studentName}`,
              amount: invoice.amount || 0,
              dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
              status: invoice.status || 'PENDING',
              displayStatus, // For UI display
              paidDate: invoice.paidDate ? new Date(invoice.paidDate) : null,
              paymentMethod: latestPayment?.method || invoice.paidMethod || null,
              paymentDate: latestPayment?.createdAt ? new Date(latestPayment.createdAt) : (invoice.paidDate ? new Date(invoice.paidDate) : null),
              studentName: invoice.studentName,
              studentId: invoice.student?.id,
              // For compatibility with existing code
              children: invoice.studentName ? [{
                name: invoice.studentName,
                amount: invoice.amount || 0
              }] : []
            }
          })
          
          // Extract payment history from invoices
          const history: any[] = []
          invoices.forEach((invoice: any) => {
            if (invoice.payments && Array.isArray(invoice.payments)) {
              invoice.payments.forEach((payment: any) => {
                history.push({
                  id: payment.id,
                  invoiceNumber: invoice.invoiceNumber,
                  studentName: invoice.studentName,
                  amount: payment.amount || 0,
                  paymentMethod: payment.method || 'Unknown',
                  paymentDate: payment.createdAt ? new Date(payment.createdAt) : new Date(),
                  status: payment.status || 'SUCCEEDED',
                  transactionId: payment.id
                })
              })
            }
          })
          
          setFees(transformedFees)
          setPaymentHistory(history)
          
          // Update sessionStorage for overdue banner
          const overdueCount = transformedFees.filter((f: any) => {
            const status = f?.displayStatus || f?.status
            return status === 'OVERDUE'
          }).length
          const overdueAmount = transformedFees
            .filter((f: any) => {
              const status = f?.displayStatus || f?.status
              return status === 'OVERDUE'
            })
            .reduce((sum: number, f: any) => sum + (f?.amount || 0), 0)
          
          if (overdueCount > 0) {
            sessionStorage.setItem('hasOverduePayments', 'true')
            sessionStorage.setItem('overdueAmount', overdueAmount.toString())
            sessionStorage.setItem('overdueCount', overdueCount.toString())
          } else {
            sessionStorage.setItem('hasOverduePayments', 'false')
            sessionStorage.setItem('overdueAmount', '0')
            sessionStorage.setItem('overdueCount', '0')
          }
          
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching payments:', err)
          setFees([])
          setPaymentHistory([])
          setLoading(false)
        })

    fetchPaymentSettings()
  }, [status])

  const handlePaymentMethodChange = async (method: 'CASH' | 'BANK_TRANSFER') => {
    setPreferredPaymentMethod(method)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredPaymentMethod: method })
      })
      
      if (response.ok) {
      } else {
      }
    } catch (error) {
    }
  }

  const handleOverduePaymentClick = () => {
    setSelectedInvoiceId(null) // Pay all overdue
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh the page data after successful payment
    window.location.reload()
  }

  // Filter fees: show upcoming (48h before due) and overdue, but not paid
  const pendingFees = safeFees.filter((fee: any) => {
    if (fee?.status === 'PAID') return false
    // Use displayStatus if available, otherwise check status
    const status = fee?.displayStatus || fee?.status
    return status === 'UPCOMING' || status === 'OVERDUE' || status === 'PENDING'
  })
  
  const upcomingFees = pendingFees.filter((fee: any) => {
    const status = fee?.displayStatus || fee?.status
    return status === 'UPCOMING'
  })
  
  const overdueFees = pendingFees.filter((fee: any) => {
    const status = fee?.displayStatus || fee?.status
    return status === 'OVERDUE'
  })
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="border-b border-[var(--border)]">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Table skeleton */}
        <TableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and pay your children's school fees
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Mobile: Dropdown Select */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <span>Overview</span>
                </div>
              </SelectItem>
              <SelectItem value="history">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span>Payment History</span>
                </div>
              </SelectItem>
              <SelectItem value="settings">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Methods</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Payment History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Payment Methods</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Payment Summary - Similar to Subscription Tab */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Next Payment */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Next Payment</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Date</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {(() => {
                          // Calculate next payment date based on billing day
                          const today = new Date()
                          const billingDay = paymentSettings.billingDay || 15
                          
                          // Get next payment date (next occurrence of billing day)
                          let nextPaymentDate = new Date(today.getFullYear(), today.getMonth(), billingDay)
                          
                          // If billing day has passed this month, move to next month
                          if (nextPaymentDate < today) {
                            nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay)
                          }
                          
                          // If there are pending fees with earlier due dates, show the earliest one instead
                          if (pendingFees.length > 0) {
                            const earliestDueDate = pendingFees
                              .map((fee: any) => fee.dueDate ? new Date(fee.dueDate) : null)
                              .filter((date: Date | null) => date !== null)
                              .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0]
                            
                            if (earliestDueDate && earliestDueDate < nextPaymentDate) {
                              return format(earliestDueDate, 'd MMM yyyy')
                            }
                          }
                          
                          return format(nextPaymentDate, 'd MMM yyyy')
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Amount</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        £{pendingFees.length > 0 ? pendingFees.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Status</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Upcoming</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${upcomingFees.length > 0 ? 'bg-yellow-500' : overdueFees.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {upcomingFees.length > 0 
                            ? `${upcomingFees.length} invoice${upcomingFees.length !== 1 ? 's' : ''}` 
                            : overdueFees.length > 0
                            ? `${overdueFees.length} overdue`
                            : 'None'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Children</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {(() => {
                          const uniqueChildren = new Set<string>()
                          safeFees.forEach((fee: any) => {
                            if (fee?.studentName) {
                              uniqueChildren.add(fee.studentName)
                            } else if (fee?.children && Array.isArray(fee.children)) {
                              fee.children.forEach((child: any) => {
                                if (child?.name) uniqueChildren.add(child.name)
                              })
                            }
                          })
                          return uniqueChildren.size
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Summary Cards */}
          {pendingFees.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">All Caught Up!</h3>
                <p className="text-sm text-gray-600">You have no upcoming or overdue payments at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Children at Madrasah"
                value={`${(() => {
                  const uniqueChildren = new Set<string>()
                  safeFees.forEach((fee: any) => {
                    if (fee?.studentName) {
                      uniqueChildren.add(fee.studentName)
                    } else if (fee?.children && Array.isArray(fee.children)) {
                      fee.children.forEach((child: any) => {
                        if (child?.name) uniqueChildren.add(child.name)
                      })
                    }
                  })
                  return uniqueChildren.size
                })()}`}
                change={{ value: `${pendingFees.length} fees`, type: "neutral" }}
                description="Total enrolled"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="Monthly Fees"
                value={`£${Math.round(pendingFees.reduce((sum: number, fee: any) => {
                  if (fee?.children && Array.isArray(fee.children) && fee.children.length > 0) {
                    return sum + fee.children.reduce((childSum: number, child: any) => childSum + (child?.amount || 0), 0)
                  }
                  return sum + (fee?.amount || 0)
                }, 0))}`}
                change={{ value: "Regular fees", type: "neutral" }}
                description="Monthly charges"
                icon={<Receipt className="h-5 w-5" />}
              />
              <StatCard
                title="Overdue Amount"
                value={`£${Math.round(overdueFees.reduce((sum: number, fee: any) => sum + (fee?.amount || 0), 0))}`}
                change={{
                  value: overdueFees.length > 0 ? "Overdue" : "None",
                  type: overdueFees.length > 0 ? "negative" : "positive"
                }}
                description={overdueFees.length > 0 ? "Payment overdue" : "All up to date"}
                icon={<AlertTriangle className="h-5 w-5" />}
                onClick={overdueFees.length > 0 ? handleOverduePaymentClick : undefined}
              />
              <StatCard
                title="Date Due"
                value={pendingFees.length > 0 && pendingFees[0]?.dueDate ? format(new Date(pendingFees[0].dueDate), 'MMM dd') : 'N/A'}
                change={{ value: "Next due", type: "neutral" }}
                description="Payment deadline"
                icon={<Calendar className="h-5 w-5" />}
              />
            </div>
          )}

          {/* Upcoming/Overdue Invoices */}
          {pendingFees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  {upcomingFees.length > 0 ? 'Upcoming Payments' : overdueFees.length > 0 ? 'Overdue Payments' : 'Pending Payments'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {pendingFees.map((fee: any, index: number) => (
                    <div key={fee.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 hover:bg-[var(--accent)]/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[var(--foreground)] text-sm sm:text-base">
                              {fee.invoiceNumber || fee.id}
                            </h3>
                            <Badge
                              variant={
                                (fee.displayStatus || fee.status) === 'OVERDUE' 
                                  ? 'destructive' 
                                  : (fee.displayStatus || fee.status) === 'UPCOMING'
                                  ? 'default'
                                  : 'outline'
                              }
                              className="text-xs"
                            >
                              {(fee.displayStatus || fee.status) === 'UPCOMING' ? 'Upcoming' : (fee.displayStatus || fee.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {fee.studentName || fee.student || 'Unknown Student'}
                          </p>
                          {fee.dueDate && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              Due: {format(new Date(fee.dueDate), 'MMM dd, yyyy')}
                            </p>
                          )}
                          {fee.status === 'PAID' && fee.paymentDate && fee.paymentMethod && (
                            <p className="text-xs text-green-600 mt-1">
                              Paid: {format(new Date(fee.paymentDate), 'MMM dd, yyyy')} via {fee.paymentMethod}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0 sm:ml-4">
                          <div className="text-left sm:text-right">
                            <div className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                              £{(fee.amount || 0).toFixed(2)}
                            </div>
                          </div>
                          {fee.status !== 'PAID' ? (
                            <Button
                              variant={(fee.displayStatus || fee.status) === 'OVERDUE' ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceId(fee.id)
                                setIsPaymentModalOpen(true)
                              }}
                              className="flex-shrink-0"
                            >
                              <CreditCard className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Pay Now</span>
                              <span className="sm:hidden">Pay</span>
                            </Button>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800 flex-shrink-0">
                              Paid
                            </Badge>
                          )}
                        </div>
                      </div>
                      {index < pendingFees.length - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">No Payment History</h3>
                  <p className="text-sm text-gray-600">Your payment history will appear here once you make payments.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Fee
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Payment Method
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Payment Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment: any, index: number) => (
                        <tr key={payment?.id || `payment-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment?.invoiceNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment?.studentName || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            £{((payment?.amount || 0) as number).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment?.paymentMethod || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment?.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {payment?.status || 'SUCCEEDED'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment?.transactionId || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Payment Method Preference */}
          {((paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) || 
            (paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled) ||
            paymentSettings.acceptsCard) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Method Preference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Select your preferred payment method. This will be used for all fee payments.
                </p>
                <div>
                  {/* Cash Payment Toggle */}
                  {(paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) && (
                    <div>
                      <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="font-medium">Cash Payment</h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Pay in cash at the school office
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferredPaymentMethod === 'CASH'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handlePaymentMethodChange('CASH')
                          } else if (paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled) {
                            // If unchecking cash and bank is available, switch to bank
                            handlePaymentMethodChange('BANK_TRANSFER')
                          }
                        }}
                        disabled={!(paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled) && preferredPaymentMethod === 'CASH'}
                      />
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer Toggle */}
                  {(paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled) && (
                    <div>
                      {(paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Building2 className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="font-medium">Bank Transfer</h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Transfer money directly to the school's bank account
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={preferredPaymentMethod === 'BANK_TRANSFER'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handlePaymentMethodChange('BANK_TRANSFER')
                          } else if (paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) {
                            // If unchecking bank and cash is available, switch to cash
                            handlePaymentMethodChange('CASH')
                          }
                        }}
                        disabled={!(paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) && preferredPaymentMethod === 'BANK_TRANSFER'}
                      />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Validation Message */}
                {!preferredPaymentMethod && ((paymentSettings.acceptsCash || paymentSettings.cashPaymentEnabled) && (paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled)) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      <strong>Please select a payment method.</strong> You must choose one payment method to continue.
                    </p>
                  </div>
                )}
                
                {/* Success Message */}
                {preferredPaymentMethod && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                      <strong>Selected:</strong> {preferredPaymentMethod === 'CASH' ? 'Cash Payment' : 'Bank Transfer'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bank Transfer Details */}
          {preferredPaymentMethod === 'BANK_TRANSFER' && (paymentSettings.acceptsBankTransfer || paymentSettings.bankTransferEnabled) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Bank Transfer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentSettings.bankAccountName ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Account Name</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{paymentSettings.bankAccountName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Sort Code</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{paymentSettings.bankSortCode || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Account Number</Label>
                        <p className="text-sm font-medium text-gray-900 mt-1">{paymentSettings.bankAccountNumber || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Setting up a Standing Order</span>
                      </div>
                      <p className="text-sm text-blue-800 mb-2">
                        A standing order is an automatic payment that sends money from your bank account to the school each month. 
                        You can set this up through your online banking or mobile banking app using the account details above.
                      </p>
                      <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">Payment Schedule:</p>
                        <p className="text-sm text-blue-800">
                          <strong>Payment Date:</strong> The {paymentSettings.billingDay || 1}{paymentSettings.billingDay === 1 ? 'st' : paymentSettings.billingDay === 2 ? 'nd' : paymentSettings.billingDay === 3 ? 'rd' : 'th'} of each month
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                          <strong>Amount:</strong> Your monthly fee amount (as shown in your invoices)
                        </p>
                      </div>
                      <p className="text-sm text-blue-800 mt-3 font-medium">
                        Once set up, payments will be made automatically each month—no need to remember to pay manually!
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      Bank account details are not yet configured. Please contact the school office for payment instructions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Instructions */}
          {paymentSettings.paymentInstructions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {paymentSettings.paymentInstructions}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setSelectedInvoiceId(null)
        }}
        overdueAmount={selectedInvoiceId 
          ? Math.round((pendingFees.find((f: any) => f.id === selectedInvoiceId)?.amount || 0))
          : Math.round(overdueFees.reduce((sum: number, fee: any) => sum + (fee?.amount || 0), 0))}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}