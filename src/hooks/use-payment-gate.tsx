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
    if (session?.user?.id) {
      checkPaymentStatus()
    }
  }, [session])

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch('/api/settings/payment')
      if (response.ok) {
        const data = await response.json()
        setPaymentStatus({
          hasPaymentMethod: !!data.paymentMethodId,
          autoPayEnabled: data.autoPayEnabled,
          lastUpdated: data.lastUpdated
        })
      } else {
        setPaymentStatus({
          hasPaymentMethod: false,
          autoPayEnabled: false
        })
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      setPaymentStatus({
        hasPaymentMethod: false,
        autoPayEnabled: false
      })
    } finally {
      setLoading(false)
    }
  }

  const checkAction = (action: string): boolean => {
    // If still loading, block the action to be safe
    if (loading) {
      console.log('Payment gate: Still loading, blocking action')
      return false
    }
    
    // If no payment status yet, block the action
    if (!paymentStatus) {
      console.log('Payment gate: No payment status, blocking action')
      setBlockedAction(action)
      setShowModal(true)
      return false
    }
    
    // If no payment method, show modal
    if (!paymentStatus.hasPaymentMethod) {
      console.log('Payment gate: No payment method, showing modal for action:', action)
      setBlockedAction(action)
      setShowModal(true)
      return false
    }
    
    console.log('Payment gate: Payment method exists, allowing action:', action)
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
