'use client'

import { PaymentRequiredModal } from '@/components/payment-required-modal'
import { PaymentGateProvider, usePaymentGateContext } from '@/contexts/payment-gate-context'

interface PaymentSetupGateProps {
  children: React.ReactNode
  userRole?: string
}

function PaymentGateContent({ children, userRole }: PaymentSetupGateProps) {
  const { 
    paymentStatus, 
    loading, 
    showModal, 
    blockedAction, 
    closeModal, 
    handlePaymentSuccess 
  } = usePaymentGateContext()

  // Always show children immediately - payment check happens in background
  // No loading state visible to user
  return (
    <>
      {children}
      
      <PaymentRequiredModal
        isOpen={showModal}
        onClose={closeModal}
        action={blockedAction}
        userRole={userRole}
      />
    </>
  )
}

export function PaymentSetupGate({ children, userRole }: PaymentSetupGateProps) {
  return (
    <PaymentGateProvider userRole={userRole}>
      <PaymentGateContent userRole={userRole}>
        {children}
      </PaymentGateContent>
    </PaymentGateProvider>
  )
}