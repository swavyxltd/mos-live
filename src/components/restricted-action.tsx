'use client'

import { usePaymentGateContext } from '@/contexts/payment-gate-context'
import { ReactNode, MouseEvent } from 'react'

interface RestrictedActionProps {
  children: ReactNode
  action: string
  onClick?: (e: MouseEvent) => void
  className?: string
  disabled?: boolean
}

export function RestrictedAction({ 
  children, 
  action, 
  onClick, 
  className, 
  disabled 
}: RestrictedActionProps) {
  const { checkAction } = usePaymentGateContext()

  const handleClick = (e: MouseEvent) => {
    if (disabled) return
    
    const canProceed = checkAction(action)
    
    if (canProceed && onClick) {
      onClick(e)
    } else {
    }
  }

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  )
}
