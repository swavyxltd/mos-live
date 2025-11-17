'use client'

import { ReactNode } from 'react'

interface PhoneLinkProps {
  phone: string
  children?: ReactNode
  className?: string
}

/**
 * Formats a phone number for use in tel: links by removing spaces and special characters
 */
function formatPhoneForTel(phone: string): string {
  // Remove all non-digit characters except + at the start
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
}

/**
 * PhoneLink component that makes phone numbers clickable
 * Works on both mobile and desktop - opens the dialer/calling app
 */
export function PhoneLink({ phone, children, className = '' }: PhoneLinkProps) {
  if (!phone) return <span className={className}>{children || phone}</span>
  
  const telLink = `tel:${formatPhoneForTel(phone)}`
  
  return (
    <a 
      href={telLink}
      className={`text-inherit no-underline hover:no-underline ${className}`}
      onClick={(e) => {
        // Allow the link to work naturally
        e.stopPropagation()
      }}
    >
      {children || phone}
    </a>
  )
}

