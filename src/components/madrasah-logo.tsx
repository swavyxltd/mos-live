'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MadrasahLogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'lg-sm'
}

export function MadrasahLogo({ className = '', showText = true, textSize = 'md', size = 'md' }: MadrasahLogoProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check initial dark mode state on client side only
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    // Check initial dark mode state
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'))
      }
    }
    
    // Check immediately
    checkDarkMode()

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode)
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }

    return () => observer.disconnect()
  }, [])

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  }

  const logoSizeClasses = {
    sm: 'sm:w-32 sm:h-6',
    md: 'sm:w-48 sm:h-10',
    lg: 'sm:w-64 sm:h-12',
    'lg-sm': 'sm:w-56 sm:h-12',
    xl: 'sm:w-72 sm:h-15'
  }

  // Use dark logo when dark mode is active
  const logoSrc = isDarkMode ? '/logo-dark.png' : '/madrasah-logo.png'

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - Using your PNG image */}
      <div className="flex items-center justify-start mb-2 w-full">
        <Image 
          src={logoSrc} 
          alt="Madrasah OS Logo" 
          width={size === 'sm' ? 128 : size === 'md' ? 192 : size === 'lg' ? 256 : size === 'lg-sm' ? 224 : 288}
          height={size === 'sm' ? 24 : size === 'md' ? 40 : size === 'lg' ? 48 : size === 'lg-sm' ? 48 : 60}
          className={cn('w-full object-contain max-w-full h-auto', logoSizeClasses[size])}
          priority
        />
      </div>
      
      {/* Text */}
      {showText && (
        <div className={`text-center ${textSizeClasses[textSize]} font-semibold text-[var(--foreground)]`}>
          Madrasah OS
        </div>
      )}
    </div>
  )
}
