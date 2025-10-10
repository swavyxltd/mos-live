'use client'

import { PaymentSetupGate } from '@/components/payment-setup-gate'

interface OwnerLayoutWrapperProps {
  children: React.ReactNode
  userRole?: string
}

export function OwnerLayoutWrapper({ children, userRole }: OwnerLayoutWrapperProps) {
  return (
    <PaymentSetupGate userRole={userRole}>
      {children}
    </PaymentSetupGate>
  )
}
