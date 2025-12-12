'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PaymentModal } from '@/components/payment-modal'

interface OverdueData {
  hasOverdue: boolean
  overdueAmount: number
  overdueCount: number
}

export function OverduePaymentBanner() {
  const [overdueData, setOverdueData] = useState<OverdueData | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  useEffect(() => {
    // Fetch overdue data directly from API to get accurate values
    const fetchOverdueData = async () => {
      try {
        const response = await fetch('/api/payments')
        if (!response.ok) return
        
        const invoices = await response.json()
        if (!Array.isArray(invoices)) return
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Calculate overdue invoices (same logic as dashboard)
        const overdueInvoices = invoices.filter((invoice: any) => {
          if (invoice.status === 'PAID') return false
          const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
          if (!dueDate) return false
          const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return days <= 0
        })
        
        const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => {
          // Amount is already in pounds from the API
          return sum + (inv.amount || 0)
        }, 0)
        
        const overdueCount = overdueInvoices.length
        
        if (overdueCount > 0) {
          setOverdueData({
            hasOverdue: true,
            overdueAmount,
            overdueCount
          })
        } else {
          setOverdueData({
            hasOverdue: false,
            overdueAmount: 0,
            overdueCount: 0
          })
        }
      } catch (error) {
        console.error('Error fetching overdue data:', error)
      }
    }
    
    fetchOverdueData()
    // Re-fetch periodically to catch updates
    const interval = setInterval(fetchOverdueData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handlePayNow = () => {
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Update sessionStorage after successful payment
    sessionStorage.setItem('hasOverduePayments', 'false')
    sessionStorage.setItem('overdueAmount', '0')
    sessionStorage.setItem('overdueCount', '0')
    setOverdueData({
      hasOverdue: false,
      overdueAmount: 0,
      overdueCount: 0
    })
    setIsPaymentModalOpen(false)
  }

  if (!overdueData?.hasOverdue) {
    return null
  }

  return (
    <>
      <Card className="mb-6 border-red-200 bg-red-50 w-full max-w-full">
        <CardContent className="p-4 !pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-red-900">
                  Payment Overdue
                </h3>
                <p className="text-sm text-red-700">
                  You have {overdueData.overdueCount} overdue payment{overdueData.overdueCount !== 1 ? 's' : ''} totaling £{overdueData.overdueAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <Button 
              onClick={handlePayNow}
              className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        overdueAmount={overdueData.overdueAmount}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  )
}
