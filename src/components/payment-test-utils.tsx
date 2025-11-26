'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export function PaymentTestUtils() {
  const [loading, setLoading] = useState(false)

  const clearPaymentMethod = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Payment method cleared for testing')
        // Reload the page to reset the payment gate state
        window.location.reload()
      } else {
        toast.error('Failed to clear payment method')
      }
    } catch (error) {
      toast.error('Failed to clear payment method')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/payment')
      const data = await response.json()
      
      if (data.paymentMethodId) {
        toast.success(`Payment method exists: ${data.paymentMethodId}`)
      } else {
        toast.info('No payment method found')
      }
    } catch (error) {
      toast.error('Failed to check payment status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Payment Test Utilities
        </CardTitle>
        <CardDescription>
          Tools to help test the payment gate system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={checkPaymentStatus}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Check Payment Status
        </Button>
        
        <Button 
          onClick={clearPaymentMethod}
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Payment Method (for testing)
        </Button>
        
        <p className="text-sm text-gray-500">
          Use these tools to test different payment states. 
          Clear payment method to test the "no payment" scenario.
        </p>
      </CardContent>
    </Card>
  )
}
