import React from 'react'

interface MadrasahLogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg'
}

export function MadrasahLogo({ className = '', showText = true, textSize = 'md' }: MadrasahLogoProps) {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - Using your PNG image */}
      <div className="flex items-center justify-start mb-2">
        <img 
          src="/madrasah-logo.png" 
          alt="Madrasah OS Logo" 
          className="w-48 h-10 object-contain"
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
