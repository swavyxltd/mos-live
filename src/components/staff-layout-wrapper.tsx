'use client'

import { PaymentSetupGate } from '@/components/payment-setup-gate'
import { StaffSubrole } from '@/types/staff-roles'

interface StaffLayoutWrapperProps {
  children: React.ReactNode
  userRole?: string
  staffSubrole?: StaffSubrole
}

export function StaffLayoutWrapper({ children, userRole, staffSubrole }: StaffLayoutWrapperProps) {
  return (
    <PaymentSetupGate userRole={userRole}>
      {children}
    </PaymentSetupGate>
  )
}
