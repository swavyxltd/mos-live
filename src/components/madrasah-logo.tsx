'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface MadrasahLogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'lg-sm'
}

export function MadrasahLogo({ className = '', showText = true, textSize = 'md', size = 'md' }: MadrasahLogoProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const hasDark = document.documentElement.classList.contains('dark')
        setIsDarkMode(hasDark)
      }
    }
    
    // Check immediately
    checkDarkMode()

    // Check again after delays
    const timeoutId1 = setTimeout(checkDarkMode, 50)
    const timeoutId2 = setTimeout(checkDarkMode, 200)

    // Watch for class changes
    const observer = new MutationObserver(() => {
      setTimeout(checkDarkMode, 10)
    })
    
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    }

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      observer.disconnect()
    }
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

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="flex items-center justify-start mb-2 w-full">
          <div className={cn('w-full', logoSizeClasses[size])} style={{ height: size === 'sm' ? 24 : size === 'md' ? 40 : size === 'lg' ? 48 : size === 'lg-sm' ? 48 : 60 }} />
        </div>
      </div>
    )
  }

  // Use logo-dark.png when dark mode is ON, madrasah-logo.png when OFF
  const logoSrc = isDarkMode ? '/logo-dark.png' : '/madrasah-logo.png'

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - Using regular img tag for better compatibility */}
      <div className="flex items-center justify-start mb-2 w-full">
        <img 
          key={logoSrc}
          src={logoSrc} 
          alt="Madrasah OS Logo" 
          className={cn('w-full object-contain max-w-full h-auto', logoSizeClasses[size])}
          style={{ 
            width: '100%',
            height: 'auto',
            maxWidth: '100%'
          }}
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
