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
    // Check if we're on a dashboard route
    const isDashboardRoute = pathname?.includes('/dashboard') || 
                            pathname?.includes('/parent/dashboard') ||
                            pathname?.includes('/owner/overview')
    
    if (!isDashboardRoute) {
      setShowLoader(false)
      return
    }

    // Check if this is the first load (no previous pathname in session)
    const hasVisitedBefore = sessionStorage.getItem('hasVisitedApp')
    
    if (hasVisitedBefore) {
      setShowLoader(false)
      return
    }

    // Mark as visited
    sessionStorage.setItem('hasVisitedApp', 'true')

    // Check payment status while loader is showing (only on initial login)
    const checkPaymentStatus = async () => {
      if (!session?.user?.id || session.user.isSuperAdmin) {
        return
      }

      try {
        // Check platform payment method (for staff/admin)
        const response = await fetch('/api/settings/platform-payment')
        if (response.ok) {
          const data = await response.json()
          sessionStorage.setItem('hasPaymentMethod', data.paymentMethodId ? 'true' : 'false')
        } else {
          sessionStorage.setItem('hasPaymentMethod', 'false')
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
        sessionStorage.setItem('hasPaymentMethod', 'false')
      }

      // Check overdue payments (for parents)
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
          console.error('Error checking overdue payments:', error)
        }
      }
    }

    // Start checking payment status
    checkPaymentStatus()

    // Animate progress bar over 2 seconds
    const duration = 2000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)
      
      if (newProgress < 100) {
        requestAnimationFrame(animate)
      } else {
        // Hide loader after 2 seconds
        setTimeout(() => {
          setShowLoader(false)
        }, 100)
      }
    }
    
    requestAnimationFrame(animate)
  }, [pathname, session])

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

