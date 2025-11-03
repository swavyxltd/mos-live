'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RDI2iF1U7vapCCJ7iKQ4ZQV4xm6cAjx9VLf99E4EiszwmxKbEGVwx6ftk4850CvQhFe28knRarrhsSrcfHyjeSl00iHcE5fTW')

interface StripePaymentMethodProps {
  onSuccess?: (paymentMethodId: string) => void
  onCancel?: () => void
  clientSecret?: string // Allow passing client secret from parent
  isPlatformBilling?: boolean // Flag to use platform billing endpoint
}

function PaymentMethodForm({ onSuccess, onCancel, clientSecret: propClientSecret, isPlatformBilling }: StripePaymentMethodProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string>(propClientSecret || '')
  const [initializing, setInitializing] = useState(!propClientSecret)

  useEffect(() => {
    // If client secret is provided, skip fetching
    if (propClientSecret) {
      setClientSecret(propClientSecret)
      setInitializing(false)
      return
    }

    // Get setup intent from API - use platform billing endpoint if flag is set
    const endpoint = isPlatformBilling 
      ? '/api/settings/platform-payment' 
      : '/api/stripe/setup-intent'
    
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create setup intent')
        }
        return data
      })
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          throw new Error(data.error || 'Failed to initialize payment setup')
        }
      })
      .catch((error) => {
        console.error('Setup intent error:', error)
        toast.error(error.message || 'Failed to create setup intent. Please check your Stripe configuration.')
      })
      .finally(() => {
        setInitializing(false)
      })
  }, [propClientSecret, isPlatformBilling])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setLoading(true)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setLoading(false)
      return
    }

    const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardElement,
      }
    })

    if (error) {
      toast.error(error.message || 'Failed to save payment method')
      setLoading(false)
    } else if (setupIntent && setupIntent.payment_method) {
      toast.success('Payment method saved successfully!')
      onSuccess?.(setupIntent.payment_method as string)
    }
  }

  if (initializing) {
    return (
      <div className="space-y-6">
        <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Setting up secure payment</h3>
            <p className="text-sm text-gray-600">Please wait while we prepare your payment form...</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Card Information
        </label>
        <div className="p-4 border-2 border-gray-200 rounded-xl bg-white hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
                invalid: {
                  color: '#EF4444',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Your card information is encrypted and secure. We never store your card details.
        </p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Secure & Encrypted</h4>
            <p className="text-xs text-blue-700">
              Your payment information is processed securely by Stripe and never stored on our servers.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="submit" 
          disabled={!stripe || loading || !clientSecret} 
          className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4 mr-2" />
          )}
          Save Payment Method
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="h-11 px-6"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function StripePaymentMethodModal({ onSuccess, onCancel, clientSecret, isPlatformBilling = true }: StripePaymentMethodProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.()
        }
      }}
    >
      <div className="w-full max-w-lg my-8 animate-in fade-in-0 zoom-in-95 duration-200">
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Add Payment Method
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Securely add a payment method for automatic billing of £1 per student monthly
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Elements stripe={stripePromise}>
              <PaymentMethodForm 
                onSuccess={onSuccess} 
                onCancel={onCancel} 
                clientSecret={clientSecret}
                isPlatformBilling={isPlatformBilling}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
