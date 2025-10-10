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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking payment setup...</p>
        </div>
      </div>
    )
  }

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