'use client'

import { PaymentSetupGate } from '@/components/payment-setup-gate'

interface StaffLayoutWrapperProps {
  children: React.ReactNode
  userRole?: string
}

export function StaffLayoutWrapper({ children, userRole }: StaffLayoutWrapperProps) {
  return (
    <PaymentSetupGate userRole={userRole}>
      {children}
    </PaymentSetupGate>
  )
}
