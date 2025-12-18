'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

function InitialAppLoaderContent() {
  const [showLoader, setShowLoader] = useState(true)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setShowLoader(false)
    }, 5000) // Max 5 seconds loading time

    // Wait for session to be loaded, but don't wait forever
    if (status === 'loading') {
      // If loading takes more than 3 seconds, hide loader anyway
      const loadingTimeout = setTimeout(() => {
        setShowLoader(false)
      }, 3000)
      return () => {
        clearTimeout(loadingTimeout)
        clearTimeout(timeout)
      }
    }

    // Only show on initial app load (dashboard routes after sign-in)
    // Check if we're on a dashboard route or any parent/staff/owner route
    const isDashboardRoute = pathname?.includes('/dashboard') || 
                            pathname?.includes('/parent/dashboard') ||
                            pathname?.includes('/owner/overview')
    
    // Also show on any parent portal route on first login
    const isParentRoute = pathname?.startsWith('/parent/')
    const isStaffRoute = pathname?.startsWith('/staff/') || pathname?.startsWith('/admin/')
    const isOwnerRoute = pathname?.startsWith('/owner/')
    
    const isAppRoute = isDashboardRoute || isParentRoute || isStaffRoute || isOwnerRoute
    
    if (!isAppRoute) {
      clearTimeout(timeout)
      setShowLoader(false)
      return
    }

    // If no session after loading completes, hide loader (user will be redirected to login)
    if (status === 'unauthenticated' || (!session?.user?.id && status !== 'loading')) {
      clearTimeout(timeout)
      setShowLoader(false)
      return
    }

    // Wait for session to be available (important for 2FA flow)
    // But don't wait forever - if session doesn't load, hide loader
    if (!session?.user?.id) {
      return
    }

    // Detect if this is a browser refresh or app reopen
    const isRefresh = performance.getEntriesByType('navigation')[0]?.type === 'reload'
    const isAppReopen = performance.getEntriesByType('navigation')[0]?.type === 'navigate' && 
                        document.referrer === '' && 
                        !sessionStorage.getItem('appJustOpened')
    
    // Check if this is the first load after sign-in or a browser refresh
    // Use localStorage instead of sessionStorage for persistence across app closes
    const sessionKey = `hasVisitedApp_${session.user.id}`
    const hasVisitedBefore = localStorage.getItem(sessionKey)
    
    // Show loader only on actual refresh, not on app reopen
    // For app reopens, we want to skip the loader for better UX
    const shouldShowLoader = isRefresh && !hasVisitedBefore

    if (!shouldShowLoader) {
      clearTimeout(timeout)
      setShowLoader(false)
      // Mark that app was just opened (for next time)
      sessionStorage.setItem('appJustOpened', 'true')
      setTimeout(() => sessionStorage.removeItem('appJustOpened'), 1000)
      return
    }

    // Mark as visited using localStorage (persists across app closes)
    localStorage.setItem(sessionKey, 'true')

    // Check payment status in the background (no visible loader, silent operation)
    const checkPaymentStatus = async () => {
      if (!session?.user?.id || session.user.isSuperAdmin) {
        return
      }

      try {
        // Check platform payment method (for staff/admin) - background fetch
        const response = await fetch('/api/settings/platform-payment')
        if (response.ok) {
          const data = await response.json()
          sessionStorage.setItem('hasPaymentMethod', data.paymentMethodId ? 'true' : 'false')
        } else {
          sessionStorage.setItem('hasPaymentMethod', 'false')
        }
      } catch (error) {
        // Silent error - don't show to user
        sessionStorage.setItem('hasPaymentMethod', 'false')
      }

      // Check overdue payments (for parents) - background fetch
      if (pathname?.includes('/parent')) {
        try {
          const overdueResponse = await fetch('/api/payments/overdue')
          if (overdueResponse.ok) {
            const overdueData = await overdueResponse.json()
            sessionStorage.setItem('hasOverduePayments', overdueData.hasOverdue ? 'true' : 'false')
            if (overdueData.hasOverdue) {
              sessionStorage.setItem('overdueAmount', overdueData.overdueAmount?.toString() || '0')
              sessionStorage.setItem('overdueCount', overdueData.overdueCount?.toString() || '0')
            }
          }
        } catch (error) {
          // Silent error - don't show to user
        }
      }
    }

    // Start checking payment status in background (non-blocking)
    checkPaymentStatus().catch(() => {
      // Silent error handling
    })

    // Always show loader for minimum 2 seconds
    const duration = 2000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)
      
      if (newProgress < 100) {
        requestAnimationFrame(animate)
      } else {
        // Ensure minimum 2 seconds have passed before hiding
        const timeElapsed = Date.now() - startTime
        const remainingTime = Math.max(0, duration - timeElapsed)
        
        setTimeout(() => {
          clearTimeout(timeout)
          setShowLoader(false)
        }, remainingTime + 100) // Small buffer
      }
    }
    
    requestAnimationFrame(animate)

    return () => {
      clearTimeout(timeout)
    }
  }, [pathname, session, status])

  // Don't clear localStorage on unload - we want it to persist across app closes
  // Only clear on actual refresh (handled by navigation type detection)

  if (!showLoader) return null

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

export function InitialAppLoader() {
  // Only render if we're in a browser environment (client-side)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render during SSR or before mount
  // This ensures useSession is only called when SessionProvider is available
  if (!mounted) {
    return null
  }

  return <InitialAppLoaderContent />
}

