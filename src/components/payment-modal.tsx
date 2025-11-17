'use client'

import { useState } from 'react'
import { X, CreditCard, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  overdueAmount: number
  onPaymentSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, overdueAmount, onPaymentSuccess }: PaymentModalProps) {
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleInputChange = (field: string, value: string) => {
    setCardDetails(prev => ({ ...prev, [field]: value }))
  }

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value)
    if (formatted.replace(/\s/g, '').length <= 16) {
      handleInputChange('number', formatted)
    }
  }

  const handleExpiryChange = (value: string) => {
    if (value.length <= 2) {
      handleInputChange('expiryMonth', value)
    }
  }

  const handleYearChange = (value: string) => {
    if (value.length <= 2) {
      handleInputChange('expiryYear', value)
    }
  }

  const handleCvcChange = (value: string) => {
    if (value.length <= 4) {
      handleInputChange('cvc', value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setPaymentStatus('idle')
    setErrorMessage('')

    try {
      // In demo mode, simulate payment processing
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate processing time
        
        // Store payment time in localStorage to simulate payment success
        localStorage.setItem('lastPaymentTime', Date.now().toString())
        
        // Simulate success
        setPaymentStatus('success')
        setTimeout(() => {
          onPaymentSuccess()
          onClose()
          resetForm()
        }, 2000)
        return
      }

      // Real Stripe payment processing would go here
      const response = await fetch('/api/payments/stripe/pay-overdue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: overdueAmount,
          cardDetails
        }),
      })

      if (!response.ok) {
        throw new Error('Payment failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setPaymentStatus('success')
        setTimeout(() => {
          onPaymentSuccess()
          onClose()
          resetForm()
        }, 2000)
      } else {
        throw new Error(result.error || 'Payment failed')
      }
    } catch (error) {
      setPaymentStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setCardDetails({
      number: '',
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      name: ''
    })
    setPaymentStatus('idle')
    setErrorMessage('')
  }

  const handleClose = () => {
    if (!isProcessing) {
      onClose()
      resetForm()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Pay Overdue Amount</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {paymentStatus === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Successful!</h3>
              <p className="text-sm text-green-700">
                Your payment of £{overdueAmount} has been processed successfully.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Amount to Pay:</span>
                  <span className="text-lg font-bold text-gray-900">£{overdueAmount}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.number}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    disabled={isProcessing}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    type="text"
                    placeholder="John Doe"
                    value={cardDetails.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={isProcessing}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiryMonth">Month</Label>
                    <Input
                      id="expiryMonth"
                      type="text"
                      placeholder="MM"
                      value={cardDetails.expiryMonth}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      disabled={isProcessing}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryYear">Year</Label>
                    <Input
                      id="expiryYear"
                      type="text"
                      placeholder="YY"
                      value={cardDetails.expiryYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                      disabled={isProcessing}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      type="text"
                      placeholder="123"
                      value={cardDetails.cvc}
                      onChange={(e) => handleCvcChange(e.target.value)}
                      disabled={isProcessing}
                      required
                    />
                  </div>
                </div>
              </div>

              {paymentStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay £{overdueAmount}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
