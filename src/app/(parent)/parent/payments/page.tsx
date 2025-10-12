'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { isDemoMode } from '@/lib/demo-mode'
import { format } from 'date-fns'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Receipt,
  Settings,
  HelpCircle,
  CheckCircle,
  History,
  Banknote,
  Users,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { PaymentModal } from '@/components/payment-modal'

export default function ParentInvoicesPage() {
  const { data: session, status } = useSession()
  const [fees, setFees] = useState<any[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [loading, setLoading] = useState(true)
  const [paymentSettings, setPaymentSettings] = useState({
    autoPaymentEnabled: true,
    cashPaymentEnabled: true,
    bankTransferEnabled: true,
    paymentInstructions: '',
    hasStripeConfigured: false
  })
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'CARD' | 'CASH' | 'BANK_TRANSFER' | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('/api/settings/payment-methods')
      if (response.ok) {
        const settings = await response.json()
        setPaymentSettings(settings)
      }
      
      // Also fetch parent's payment preferences
      const paymentResponse = await fetch('/api/settings/payment')
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json()
        setPreferredPaymentMethod(paymentData.preferredPaymentMethod)
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
    }
  }

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data - consolidated fees for parent with multiple children
      const demoFees = [
        {
          id: 'INV-2024-003',
          student: 'Ahmed & Fatima Hassan',
          description: 'Monthly fees for both children',
          amount: 100.00, // Combined amount for both children (£50 each)
          dueDate: new Date('2024-12-31'),
          status: 'PENDING',
          children: [
            { name: 'Ahmed Hassan', class: 'Quran Classes', amount: 50.00 },
            { name: 'Fatima Hassan', class: 'Islamic Studies', amount: 50.00 }
          ]
        },
      ]

      // Demo payment history
      const demoPaymentHistory = [
        {
          id: 'payment-1',
          invoiceNumber: 'INV-2024-001',
          studentName: 'Ahmed Hassan',
          amount: 50.00,
          paymentMethod: 'Credit Card',
          paymentDate: new Date('2024-11-25'),
          status: 'SUCCEEDED',
          transactionId: 'txn_123456789'
        },
        {
          id: 'payment-2',
          invoiceNumber: 'INV-2024-002',
          studentName: 'Fatima Hassan',
          amount: 50.00,
          paymentMethod: 'Bank Transfer',
          paymentDate: new Date('2024-11-28'),
          status: 'SUCCEEDED',
          transactionId: 'txn_987654321'
        },
        {
          id: 'payment-3',
          invoiceNumber: 'INV-2023-012',
          studentName: 'Ahmed Hassan',
          amount: 50.00,
          paymentMethod: 'Cash',
          paymentDate: new Date('2024-10-30'),
          status: 'SUCCEEDED',
          transactionId: null
        }
      ]

      setFees(demoFees)
      setPaymentHistory(demoPaymentHistory)
      setTotalOutstanding(demoFees.filter(fee => fee.status === 'PENDING' || fee.status === 'OVERDUE').reduce((sum, fee) => sum + fee.amount, 0))
      setLoading(false)
    } else {
      // Fetch real fees from API
      fetch('/api/payments')
        .then(res => res.json())
        .then(data => {
          setFees(data)
          setTotalOutstanding(data.filter((fee: any) => fee.status === 'PENDING').reduce((sum: number, fee: any) => sum + fee.amount, 0))
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching fees:', err)
          setLoading(false)
        })
    }

    fetchPaymentSettings()
  }, [status])

  const handlePaymentMethodChange = async (method: 'CARD' | 'CASH' | 'BANK_TRANSFER') => {
    setPreferredPaymentMethod(method)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredPaymentMethod: method })
      })
      
      if (response.ok) {
        console.log('Payment method preference saved')
      } else {
        console.error('Failed to save payment method preference')
      }
    } catch (error) {
      console.error('Error saving payment method preference:', error)
    }
  }

  const handlePayNow = async (feeId: string) => {
    if (paymentSettings.autoPaymentEnabled && paymentSettings.hasStripeConfigured) {
      // Redirect to Stripe payment
      window.location.href = `/api/payments/stripe/pay-now?invoiceId=${feeId}`
    } else {
      alert('Please contact the school office to make payment arrangements.')
    }
  }

  const handleOverduePaymentClick = () => {
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh the page data after successful payment
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading payments...</p>
        </div>
      </div>
    )
  }

  const pendingFees = fees.filter(fee => fee.status === 'PENDING' || fee.status === 'OVERDUE')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and pay your children's school fees
        </p>
      </div>


      {/* Fee Summary Cards */}
      {pendingFees.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-sm text-gray-600">You have no outstanding payments at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard
               title="Children at Madrasah"
               value={`${(() => {
                 const uniqueChildren = new Set()
                 fees.forEach(fee => {
                   if (fee.children) {
                     fee.children.forEach((child: any) => uniqueChildren.add(child.name))
                   }
                 })
                 return uniqueChildren.size
               })()}`}
               change={{ value: `${pendingFees.length} fees`, type: "neutral" }}
               description="Total enrolled"
               detail="All children"
               icon={<Users className="h-5 w-5" />}
             />
             <StatCard
               title="Monthly Fees"
               value={`£${Math.round(pendingFees.reduce((sum, fee) => {
                 if (fee.children) {
                   return sum + fee.children.reduce((childSum: number, child: any) => childSum + child.amount, 0)
                 }
                 return sum + fee.amount
               }, 0))}`}
               change={{ value: "Regular fees", type: "neutral" }}
               description="Monthly charges"
               detail={`£${(() => {
                 // Calculate cost per child from monthly fees
                 const monthlyFees = pendingFees.filter(fee => 
                   fee.description.toLowerCase().includes('monthly')
                 )
                 
                 if (monthlyFees.length === 0) return '50' // Default fallback
                 
                 // Get the first monthly fee to determine the per-child rate
                 const firstMonthlyFee = monthlyFees[0]
                 if (firstMonthlyFee.children && firstMonthlyFee.children.length > 0) {
                   // If it's a combined fee, calculate per child
                   return Math.round(firstMonthlyFee.amount / firstMonthlyFee.children.length)
                 } else {
                   // If it's a single child fee, use that amount
                   return Math.round(firstMonthlyFee.amount)
                 }
               })()} per child`}
               icon={<Receipt className="h-5 w-5" />}
             />
             <StatCard
               title="Overdue Amount"
               value={`£${Math.round(pendingFees.filter(fee => fee.status === 'OVERDUE').reduce((sum, fee) => sum + fee.amount, 0))}`}
               change={{
                 value: pendingFees.filter(fee => fee.status === 'OVERDUE').length > 0 ? "Overdue" : "None",
                 type: pendingFees.filter(fee => fee.status === 'OVERDUE').length > 0 ? "negative" : "positive"
               }}
               description={pendingFees.filter(fee => fee.status === 'OVERDUE').length > 0 ? "Payment overdue" : "All up to date"}
               detail="Overdue payments"
               icon={<AlertTriangle className="h-5 w-5" />}
               onClick={pendingFees.filter(fee => fee.status === 'OVERDUE').length > 0 ? handleOverduePaymentClick : undefined}
             />
          <StatCard
            title="Date Due"
            value={pendingFees.length > 0 ? format(pendingFees[0].dueDate, 'MMM dd') : 'N/A'}
            change={{ value: "Next due", type: "neutral" }}
            description="Payment deadline"
            detail="Monthly billing"
            icon={<Calendar className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Payment History */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
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
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        £{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(payment.paymentDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.transactionId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Preference */}
      {(paymentSettings.cashPaymentEnabled || paymentSettings.bankTransferEnabled || (paymentSettings.autoPaymentEnabled && paymentSettings.hasStripeConfigured)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Payment Preference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              How would you prefer to pay for manual payments?
            </p>
            <div className="space-y-3">
              {paymentSettings.autoPaymentEnabled && paymentSettings.hasStripeConfigured && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CARD"
                    checked={preferredPaymentMethod === 'CARD'}
                    onChange={() => handlePaymentMethodChange('CARD')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="text-sm">Credit/Debit Card</span>
                  </div>
                </label>
              )}
              {paymentSettings.cashPaymentEnabled && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={preferredPaymentMethod === 'CASH'}
                    onChange={() => handlePaymentMethodChange('CASH')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="text-sm">Cash (at school office)</span>
                  </div>
                </label>
              )}
              {paymentSettings.bankTransferEnabled && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK_TRANSFER"
                    checked={preferredPaymentMethod === 'BANK_TRANSFER'}
                    onChange={() => handlePaymentMethodChange('BANK_TRANSFER')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span className="text-sm">Bank Transfer</span>
                  </div>
                </label>
              )}
            </div>
            {preferredPaymentMethod && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Selected:</strong> {preferredPaymentMethod === 'CARD' ? 'Credit/Debit Card' : 
                   preferredPaymentMethod === 'CASH' ? 'Cash Payment' : 'Bank Transfer'}
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        overdueAmount={Math.round(pendingFees.filter(fee => fee.status === 'OVERDUE').reduce((sum, fee) => sum + fee.amount, 0))}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}