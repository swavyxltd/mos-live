'use client'

import { PaymentSetupGate } from '@/components/payment-setup-gate'

interface OwnerLayoutWrapperProps {
  children: React.ReactNode
  userRole?: string
}

export function OwnerLayoutWrapper({ children, userRole }: OwnerLayoutWrapperProps) {
  return (
    <PaymentSetupGate userRole={userRole}>
      <div className="w-full min-w-0">
        {children}
      </div>
    </PaymentSetupGate>
  )
}
