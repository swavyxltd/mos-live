'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { CreditCard, X, AlertCircle } from 'lucide-react'
import { StripePaymentMethodModal } from '@/components/stripe-payment-method'

export function PaymentRequiredBanner() {
  const { data: session, status } = useSession()
  const [hasPaymentMethod, setHasPaymentMethod] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    // Owner accounts don't need payment checks
    if (session?.user?.isSuperAdmin) {
      setHasPaymentMethod(true)
      setLoading(false)
      return
    }

    checkPaymentStatus()
    
    // Poll payment status every 5 seconds if no payment method (for webhook delay)
    const interval = setInterval(() => {
      if (!hasPaymentMethod && !loading) {
        checkPaymentStatus()
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [session, status, hasPaymentMethod, loading])

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch('/api/settings/platform-payment')
      if (response.ok) {
        const data = await response.json()
        setHasPaymentMethod(!!data.paymentMethodId)
      } else {
        setHasPaymentMethod(false)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      setHasPaymentMethod(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false)
    // Wait a moment for webhook to process, then check payment status
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check multiple times with delays to handle webhook processing time
    let foundPaymentMethod = false
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch('/api/settings/platform-payment')
        if (response.ok) {
          const data = await response.json()
          if (data.paymentMethodId) {
            setHasPaymentMethod(true)
            foundPaymentMethod = true
            break
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
      
      if (i < 4) { // Don't wait after the last check
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    // If still no payment method after all checks, reload the page
    if (!foundPaymentMethod) {
      window.location.reload()
    }
  }

  // Don't show if loading, already has payment, owner account, or dismissed
  if (loading || hasPaymentMethod || session?.user?.isSuperAdmin || dismissed) {
    return null
  }

  return (
    <>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                Payment Method Required
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                You need to add a payment method before you can add students, staff, classes, or any other data to your madrasah. 
                Add your card details to get started.
              </p>
              <Button
                onClick={() => setShowPaymentModal(true)}
                size="sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <StripePaymentMethodModal
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPaymentModal(false)}
          isPlatformBilling={true}
        />
      )}
    </>
  )
}

