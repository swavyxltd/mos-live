import React from 'react'

interface MadrasahLogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'lg-sm'
}

export function MadrasahLogo({ className = '', showText = true, textSize = 'md', size = 'md' }: MadrasahLogoProps) {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  }

  const logoSizeClasses = {
    sm: 'w-32 h-6',
    md: 'w-48 h-10',
    lg: 'w-64 h-12',
    'lg-sm': 'w-56 h-12',
    xl: 'w-72 h-15'
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - Using your PNG image */}
      <div className="flex items-center justify-start mb-2">
        <img 
          src="/madrasah-logo.png" 
          alt="Madrasah OS Logo" 
          className={`${logoSizeClasses[size]} object-contain`}
        />
      </div>
      
      {/* Text */}
      {showText && (
        <div className={`text-center ${textSizeClasses[textSize]} font-semibold text-gray-900`}>
          Madrasah OS
        </div>
      )}
    </div>
  )
}
