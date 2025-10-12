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
  const [loading, setLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  useEffect(() => {
    fetchOverdueData()
  }, [])

  const handlePayNow = () => {
    setIsPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    // Refresh overdue data after successful payment
    fetchOverdueData()
    setIsPaymentModalOpen(false)
  }

  const fetchOverdueData = async () => {
    try {
      const lastPaymentTime = localStorage.getItem('lastPaymentTime')
      const headers: HeadersInit = {}
      
      if (lastPaymentTime) {
        headers['x-last-payment-time'] = lastPaymentTime
      }
      
      const response = await fetch('/api/payments/overdue', { headers })
      if (response.ok) {
        const data = await response.json()
        setOverdueData(data)
      }
    } catch (error) {
      console.error('Error fetching overdue data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (!overdueData?.hasOverdue) {
    return null
  }

  return (
    <>
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Payment Overdue
                </h3>
                <p className="text-sm text-red-700">
                  You have {overdueData.overdueCount} overdue payment{overdueData.overdueCount !== 1 ? 's' : ''} totaling £{overdueData.overdueAmount}
                </p>
              </div>
            </div>
            <Button 
              onClick={handlePayNow}
              className="bg-red-600 hover:bg-red-700 text-white"
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
