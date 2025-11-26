import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MadrasahLogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'lg-sm'
}

export function MadrasahLogo({ className = '', showText = true, textSize = 'md', size = 'md' }: MadrasahLogoProps) {
  const textSizeClasses = {
    sm: 'text-sm',
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

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon */}
      <div className="flex items-center justify-start mb-2 w-full">
        <Image 
          src="/madrasah-logo.png" 
          alt="Madrasah OS Logo" 
          width={size === 'sm' ? 128 : size === 'md' ? 192 : size === 'lg' ? 256 : size === 'lg-sm' ? 224 : 288}
          height={size === 'sm' ? 24 : size === 'md' ? 40 : size === 'lg' ? 48 : size === 'lg-sm' ? 48 : 60}
          className={cn('w-full object-contain max-w-full h-auto', logoSizeClasses[size])}
          style={{ width: 'auto', height: 'auto' }}
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
