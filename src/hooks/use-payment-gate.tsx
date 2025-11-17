'use client'

import { useState, useEffect, useContext } from 'react'
import { useSession } from 'next-auth/react'
import { PaymentGateContext } from '@/contexts/payment-gate-context'

interface PaymentStatus {
  hasPaymentMethod: boolean
  autoPayEnabled: boolean
  lastUpdated?: string
}

export function usePaymentGate() {
  const { data: session } = useSession()
  const context = useContext(PaymentGateContext)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [blockedAction, setBlockedAction] = useState<string>('')

  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    // Owner accounts don't need payment checks
    if (session.user.isSuperAdmin) {
      setPaymentStatus({
        hasPaymentMethod: true, // Always allow owners
        autoPayEnabled: true,
        lastUpdated: undefined
      })
      setLoading(false)
      return
    }

    // First, try to get payment status from sessionStorage (set during initial load)
    const storedStatus = sessionStorage.getItem('hasPaymentMethod')
    if (storedStatus !== null) {
      // Use cached value immediately - no loading state
      setPaymentStatus({
        hasPaymentMethod: storedStatus === 'true',
        autoPayEnabled: true,
        lastUpdated: undefined
      })
      setLoading(false)
    } else {
      // If not in sessionStorage, assume true (shouldn't happen, but be permissive)
      setPaymentStatus({
        hasPaymentMethod: true,
        autoPayEnabled: true,
        lastUpdated: undefined
      })
      setLoading(false)
    }

    // Check payment status in background (non-blocking, updates sessionStorage)
    const checkPaymentStatus = async () => {
      try {
        // Check platform billing (org must have card on file)
        const response = await fetch('/api/settings/platform-payment')
        if (response.ok) {
          const data = await response.json()
          const hasPayment = !!data.paymentMethodId
          sessionStorage.setItem('hasPaymentMethod', hasPayment ? 'true' : 'false')
          setPaymentStatus({
            hasPaymentMethod: hasPayment,
            autoPayEnabled: true, // Platform billing is always auto
            lastUpdated: data.trialEndDate || undefined
          })
        } else {
          sessionStorage.setItem('hasPaymentMethod', 'false')
          setPaymentStatus({
            hasPaymentMethod: false,
            autoPayEnabled: false
          })
        }
      } catch (error) {
        // Silent error - don't show to user
        sessionStorage.setItem('hasPaymentMethod', 'false')
        setPaymentStatus({
          hasPaymentMethod: false,
          autoPayEnabled: false
        })
      }
    }

    // Run check in background (non-blocking)
    checkPaymentStatus().catch(() => {
      // Silent error handling
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const checkAction = (action: string): boolean => {
    // Owner accounts bypass all payment checks
    if (session?.user?.isSuperAdmin) {
      return true
    }

    // If no payment status yet, allow action (payment check happens in background)
    // We'll show the modal if payment is actually missing when they try to perform the action
    if (!paymentStatus) {
      return true
    }
    
    // If no payment method, show modal
    if (!paymentStatus.hasPaymentMethod) {
      setBlockedAction(action)
      setShowModal(true)
      return false
    }
    
    return true
  }

  const closeModal = () => {
    setShowModal(false)
    setBlockedAction('')
  }

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    setPaymentStatus(prev => ({
      ...prev!,
      hasPaymentMethod: true,
      lastUpdated: new Date().toISOString()
    }))
    setShowModal(false)
    setBlockedAction('')
  }

  return {
    paymentStatus,
    loading,
    showModal,
    blockedAction,
    checkAction,
    closeModal,
    handlePaymentSuccess
  }
}
