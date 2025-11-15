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
import { CreditCard, Loader2, CheckCircle, X, Shield } from 'lucide-react'
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
  const [success, setSuccess] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Check dark mode
  React.useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'))
      }
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }
    return () => observer.disconnect()
  }, [])

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
      setSuccess(true)
      // Wait a moment to show success screen, then call onSuccess
      setTimeout(() => {
        onSuccess?.(setupIntent.payment_method as string)
      }, 2000)
    }
  }

  if (initializing) {
    return (
      <div className="space-y-6">
        <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--muted)]">
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)] mb-3" />
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-1">Setting up secure payment</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Please wait while we prepare your payment form...</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--muted)]">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Payment Method Added</h3>
            <p className="text-sm text-[var(--muted-foreground)] text-center">
              Your payment method has been successfully added. You can now use all features.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Card Information
        </label>
        <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--card)] hover:border-[var(--border)] focus-within:border-[var(--ring)] focus-within:ring-1 focus-within:ring-[var(--ring)] transition-all duration-200 stripe-card-element">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: isDarkMode ? '#ffffff' : '#111827',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  '::placeholder': {
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  },
                },
                invalid: {
                  color: '#DC2626',
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Your card information is encrypted and secure. We never store your card details.
        </p>
      </div>
      
      <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1">Secure & Encrypted</h4>
            <p className="text-xs text-[var(--muted-foreground)]">
              Your payment information is processed securely by Stripe and never stored on our servers.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="submit" 
          disabled={!stripe || loading || !clientSecret} 
          className="flex-1"
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.()
        }
      }}
    >
      <div className="w-full max-w-lg my-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-[var(--foreground)]" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Add Payment Method
                  </h2>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Securely add a payment method for automatic billing of £1 per student monthly
                </p>
              </div>
              <button
                onClick={onCancel}
                className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 text-[var(--muted-foreground)]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <Elements stripe={stripePromise}>
              <PaymentMethodForm 
                onSuccess={onSuccess} 
                onCancel={onCancel} 
                clientSecret={clientSecret}
                isPlatformBilling={isPlatformBilling}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  )
}
