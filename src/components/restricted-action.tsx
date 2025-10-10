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
    
    console.log('RestrictedAction: Clicked action:', action)
    const canProceed = checkAction(action)
    console.log('RestrictedAction: Can proceed:', canProceed)
    
    if (canProceed && onClick) {
      console.log('RestrictedAction: Executing onClick')
      onClick(e)
    } else {
      console.log('RestrictedAction: Action blocked or no onClick handler')
    }
  }

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  )
}
