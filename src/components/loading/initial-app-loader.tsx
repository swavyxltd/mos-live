'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

export function InitialAppLoader() {
  const [showLoader, setShowLoader] = useState(true)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()
  const { data: session } = useSession()

  useEffect(() => {
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
      setShowLoader(false)
      return
    }

    // Wait for session to be available (important for 2FA flow)
    if (!session?.user?.id) {
      return
    }

    // Detect if this is a browser refresh
    const isRefresh = performance.getEntriesByType('navigation')[0]?.type === 'reload'
    
    // Check if this is the first load after sign-in or a browser refresh
    // Use a combination of session user ID and hasVisitedApp to detect new session
    const sessionKey = `hasVisitedApp_${session.user.id}`
    const hasVisitedBefore = sessionStorage.getItem(sessionKey)
    
    // Show loader on refresh OR first visit
    const shouldShowLoader = isRefresh || !hasVisitedBefore

    if (!shouldShowLoader) {
      setShowLoader(false)
      return
    }

    // Mark as visited for this user session (but will be cleared on refresh)
    sessionStorage.setItem(sessionKey, 'true')

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
          setShowLoader(false)
        }, remainingTime + 100) // Small buffer
      }
    }
    
    requestAnimationFrame(animate)
  }, [pathname, session])

  // Clear the visited flag on page unload (refresh detection)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session?.user?.id) {
        const sessionKey = `hasVisitedApp_${session.user.id}`
        sessionStorage.removeItem(sessionKey)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session])

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

