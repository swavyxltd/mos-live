'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { ToastContainer } from '@/components/ui/toast'
import { 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RotateCcw,
  CheckCircle2
} from 'lucide-react'

export default function OwnerRevenuePage() {
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [toasts, setToasts] = useState<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    duration?: number
  }>>([])

  // Toast functions
  const addToast = (toast: Omit<typeof toasts[0], 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }
  
  // Revenue data state
  const [revenueData, setRevenueData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch revenue data
  useEffect(() => {
    fetch('/api/owner/revenue')
      .then(res => res.json())
      .then(data => {
        setRevenueData(data)
        setLoading(false)
      })
      .catch(err => {
        setLoading(false)
      })
  }, [])

  // Handler functions
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/owner/revenue')
      const data = await res.json()
      setRevenueData(data)
    } catch (err) {
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || !revenueData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading revenue data...</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const handlePaymentReview = (payment: any) => {
    setSelectedPayment(payment)
    setIsPaymentModalOpen(true)
  }

  const handleRetryPayment = async (paymentId: string) => {
    try {
      // Find the payment details
      const payment = revenueData?.failedPayments?.find((p: any) => p.id === paymentId)
      if (!payment) return

      // Call the real Stripe API
      const response = await fetch('/api/revenue/retry-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: payment.stripePaymentIntentId, // You'll need to store this
          organizationId: payment.organizationId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Payment succeeded - remove from failed payments
        setRevenueData(prev => ({
          ...prev,
          failedPayments: prev.failedPayments.filter(p => p.id !== paymentId),
          current: {
            ...prev.current,
            failedPayments: prev.current.failedPayments - 1,
            thisMonthCollected: prev.current.thisMonthCollected + payment.amount
          }
        }))
        
        // Show success toast
        setSelectedPayment(null)
        setIsPaymentModalOpen(false)
        addToast({
          type: 'success',
          title: 'Payment Retry Successful!',
          message: `£${payment.amount} collected from ${payment.orgName}. Payment has been processed and will appear in your next revenue report.`,
          duration: 6000
        })
      } else {
        // Payment still failed - update retry count
        setRevenueData(prev => ({
          ...prev,
          failedPayments: (prev.failedPayments || []).map((p: any) => 
            p.id === paymentId 
              ? { 
                  ...p, 
                  retryCount: p.retryCount + 1, 
                  status: 'pending_retry',
                  lastError: result.paymentIntent?.last_payment_error?.message || 'Payment failed'
                }
              : p
          )
        }))
        
        // Show error toast
        addToast({
          type: 'error',
          title: 'Payment Retry Failed',
          message: `${payment.orgName} - £${payment.amount}. Error: ${result.error}. Retry count: ${payment.retryCount + 1}. Please contact the organization or try again later.`,
          duration: 8000
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'System Error',
        message: `Unable to retry payment for ${payment?.orgName || 'this organization'}. Please try again or contact support if the issue persists.`,
        duration: 8000
      })
    }
  }

  // Filter failed payments
  const filteredFailedPayments = (revenueData?.failedPayments || []).filter((payment: any) => {
    const matchesSearch = payment.orgName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Revenue Management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">
            Monitor and manage your platform's revenue streams and payment processing
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Monthly Recurring Revenue" />
            <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{revenueData?.current?.mrr?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.4%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Annual Recurring Revenue" />
            <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{revenueData?.current?.arr?.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">
              Projected annual revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Payment Success Rate" />
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData?.paymentStatus?.successRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Failed Payments" />
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData?.current?.failedPayments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown and Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Current month revenue composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Subscription Revenue</span>
                </div>
                <span className="font-medium">£{revenueData?.breakdown?.subscriptionRevenue || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">One-time Payments</span>
                </div>
                <span className="font-medium">£{revenueData?.breakdown?.oneTimePayments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Refunds</span>
                </div>
                <span className="font-medium text-red-600">-£{revenueData?.breakdown?.refunds || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium">Chargebacks</span>
                </div>
                <span className="font-medium text-red-600">-£{revenueData?.breakdown?.chargebacks || 0}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Revenue</span>
                  <span className="font-bold text-lg">£{revenueData?.breakdown?.netRevenue || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Overview</CardTitle>
            <CardDescription>Current month payment processing status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Successful</span>
                </div>
                <Badge variant="outline" className="text-green-600">{revenueData?.paymentStatus?.successful || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <Badge variant="outline" className="text-yellow-600">{revenueData?.paymentStatus?.pending || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <Badge variant="outline" className="text-red-600">{revenueData?.paymentStatus?.failed || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Refunded</span>
                </div>
                <Badge variant="outline" className="text-orange-600">{revenueData?.paymentStatus?.refunded || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Payments Requiring Attention */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-lg font-semibold">Failed Payments Requiring Attention</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending_retry">Pending Retry</option>
                <option value="manual_review">Manual Review</option>
              </select>
            </div>
          </div>
          <CardDescription>Payments that failed and need manual intervention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFailedPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{payment.orgName}</p>
                      <p className="text-sm text-gray-500">Failed on {payment.failureDate}</p>
                    </div>
                    <Badge variant={payment.status === 'manual_review' ? 'destructive' : 'secondary'}>
                      {payment.status === 'manual_review' ? 'Manual Review' : 'Pending Retry'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Reason: {payment.reason} • Retry count: {payment.retryCount}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-medium">£{payment.amount}</p>
                    <p className="text-sm text-gray-500">Next retry: {payment.nextRetry}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handlePaymentReview(payment)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                    {payment.status === 'pending_retry' && (
                      <Button variant="outline" size="sm" onClick={() => handleRetryPayment(payment.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Revenue Generators */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Generators</CardTitle>
          <CardDescription>Organizations contributing the most to your revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(revenueData?.topRevenueGenerators || []).map((org: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{org.orgName}</p>
                    <p className="text-sm text-gray-500">{org.students} students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{org.monthlyRevenue}</p>
                  <div className="flex items-center">
                    {org.growth > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-xs ${org.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {org.growth > 0 ? '+' : ''}{org.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Review Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Payment Review"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Organization</Label>
                <p className="text-sm font-medium">{selectedPayment.orgName}</p>
              </div>
              <div>
                <Label>Amount</Label>
                <p className="text-sm font-medium">£{selectedPayment.amount}</p>
              </div>
              <div>
                <Label>Failure Date</Label>
                <p className="text-sm font-medium">{selectedPayment.failureDate}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Badge variant={selectedPayment.status === 'manual_review' ? 'destructive' : 'secondary'}>
                  {selectedPayment.status === 'manual_review' ? 'Manual Review' : 'Pending Retry'}
                </Badge>
              </div>
              <div>
                <Label>Reason</Label>
                <p className="text-sm font-medium">{selectedPayment.reason}</p>
              </div>
              <div>
                <Label>Retry Count</Label>
                <p className="text-sm font-medium">{selectedPayment.retryCount}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Actions</h4>
              <div className="flex space-x-2">
                <Button onClick={() => handleRetryPayment(selectedPayment.id)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Payment
                </Button>
                <Button variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Resolved
                </Button>
                <Button variant="outline">
                  Contact Organization
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Revenue Data"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="dateRange">Date Range</Label>
            <select
              id="dateRange"
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="3months">Last 3 months</option>
              <option value="6months">Last 6 months</option>
              <option value="12months">Last 12 months</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          <div>
            <Label>Export Format</Label>
            <div className="space-y-2 mt-2">
              <label className="flex items-center space-x-2">
                <input type="radio" name="format" value="csv" defaultChecked />
                <span>CSV (Excel compatible)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="radio" name="format" value="pdf" />
                <span>PDF Report</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="radio" name="format" value="json" />
                <span>JSON (API data)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsExportModalOpen(false)
            }}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </>
  )
}