'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface PlatformOverduePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentSuccess: () => void
  orgId?: string
}

function PaymentForm({ onSuccess, onClose, clientSecret, amount }: { 
  onSuccess: () => void
  onClose: () => void
  clientSecret: string
  amount: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        toast.success('Payment successful! Your account will be reactivated shortly.')
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Amount to Pay:</span>
          <span className="text-lg font-bold text-blue-900">£{amount.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Card Information</label>
        <div className="p-3 border-2 border-gray-200 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                },
              },
            }}
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay £{amount.toFixed(2)}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function PlatformOverduePaymentModal({ 
  isOpen, 
  onClose, 
  onPaymentSuccess,
  orgId 
}: PlatformOverduePaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [requiresPaymentMethod, setRequiresPaymentMethod] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      handlePayNow()
    }
  }, [isOpen])

  const handlePayNow = async () => {
    setLoading(true)
    setError(null)
    setRequiresPaymentMethod(false)

    try {
      const response = await fetch('/api/platform-billing/pay-overdue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment')
      }

      if (data.requiresPaymentMethod) {
        // Need to collect payment method
        setRequiresPaymentMethod(true)
        setClientSecret(data.clientSecret)
        setAmount(data.amount)
      } else if (data.success) {
        // Payment succeeded immediately
        toast.success(data.message || 'Payment successful! Your account has been reactivated.')
        setTimeout(() => {
          onPaymentSuccess()
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment. Please try again.')
      toast.error(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setRequiresPaymentMethod(false)
    setClientSecret(null)
    onPaymentSuccess()
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-[95vw] sm:w-[90vw] md:w-[75vw]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Pay Overdue Balance</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Pay your overdue balance to reactivate your account
              </p>
            </div>
          </div>
          <div className="p-6">
          {loading && !requiresPaymentMethod ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-sm text-gray-600">Processing payment...</p>
            </div>
          ) : error && !requiresPaymentMethod ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <Button onClick={handlePayNow} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                Cancel
              </Button>
            </div>
          ) : requiresPaymentMethod && clientSecret ? (
            <Elements stripe={stripePromise}>
              <PaymentForm
                onSuccess={handlePaymentSuccess}
                onClose={onClose}
                clientSecret={clientSecret}
                amount={amount}
              />
            </Elements>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

