'use client'

import { createContext, useContext, ReactNode } from 'react'
import { usePaymentGate } from '@/hooks/use-payment-gate'

interface PaymentGateContextType {
  checkAction: (action: string) => boolean
  paymentStatus: any
  loading: boolean
  showModal: boolean
  blockedAction: string | null
  closeModal: () => void
  handlePaymentSuccess: (paymentMethodId: string) => void
}

export const PaymentGateContext = createContext<PaymentGateContextType | undefined>(undefined)

interface PaymentGateProviderProps {
  children: ReactNode
  userRole?: string
}

export function PaymentGateProvider({ children, userRole }: PaymentGateProviderProps) {
  const paymentGate = usePaymentGate()

  return (
    <PaymentGateContext.Provider value={paymentGate}>
      {children}
    </PaymentGateContext.Provider>
  )
}

export function usePaymentGateContext() {
  const context = useContext(PaymentGateContext)
  if (context === undefined) {
    throw new Error('usePaymentGateContext must be used within a PaymentGateProvider')
  }
  return context
}
