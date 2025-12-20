'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/**
 * Simple loading screen for session checking (e.g., on signin page)
 * Uses the same design as InitialAppLoader
 */
export function SessionCheckLoader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate progress bar
    const duration = 2000
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
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
        <p className="text-sm text-gray-600 font-medium">
          Moving Islamic education forward.
        </p>
        
        {/* Progress Bar */}
        <div className="w-64 h-0.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

