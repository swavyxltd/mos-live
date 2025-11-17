'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function TopProgressBarContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let progressInterval: NodeJS.Timeout

    const startLoading = () => {
      // Delay showing progress bar to avoid flicker on instant loads
      timeoutId = setTimeout(() => {
        setIsLoading(true)
        setProgress(0)

        // Simulate progress
        let currentProgress = 0
        progressInterval = setInterval(() => {
          currentProgress += Math.random() * 15
          if (currentProgress >= 90) {
            currentProgress = 90
          }
          setProgress(currentProgress)
        }, 100)
      }, 150)
    }

    const completeLoading = () => {
      clearTimeout(timeoutId)
      clearInterval(progressInterval)
      
      // Complete the progress bar
      setProgress(100)
      
      // Hide after animation completes
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 200)
    }

    // Start loading when route changes
    startLoading()

    // Complete loading after a short delay (simulating page load)
    const completeTimeout = setTimeout(() => {
      completeLoading()
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(completeTimeout)
      clearInterval(progressInterval)
    }
  }, [pathname, searchParams])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-[var(--muted)]">
      <div
        className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <TopProgressBarContent />
    </Suspense>
  )
}

