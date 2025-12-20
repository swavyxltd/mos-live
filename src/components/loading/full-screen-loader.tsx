'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function FullScreenLoader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate progress bar over 1 second
    const duration = 1000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)
      
      if (newProgress < 100) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <Image 
            src="/madrasah-logo.png" 
            alt="Madrasah OS" 
            width={256}
            height={48}
            className="h-12 w-auto"
            priority
            fetchPriority="high"
          />
        </div>
        
        {/* Subheading */}
        <p className="text-sm text-[var(--muted-foreground)] font-medium">
          Organising every corner of your madrasah.
        </p>
        
        {/* Progress Bar */}
        <div className="w-64 h-0.5 bg-[var(--muted)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

