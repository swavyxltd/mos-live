'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Component to ensure session is restored from cookies when PWA opens
 * This helps with iOS PWA cookie persistence issues
 */
export function SessionRestore() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Check if user just logged out - don't restore session if so
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true'
    if (justLoggedOut) {
      // Clear the flag after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('justLoggedOut')
      }, 1000)
      return
    }

    // Check if we're in a PWA standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    // Always try to restore session on mount (especially important for PWAs)
    if (!hasChecked) {
      setHasChecked(true)
      
      // Immediately try to fetch and restore session from cookies
      fetch('/api/auth/session', { 
        credentials: 'include',
        cache: 'no-store'
      })
        .then(res => res.json())
        .then(data => {
          // Only restore if we didn't just log out
          if (data?.user?.id && !sessionStorage.getItem('justLoggedOut')) {
            update()
          }
        })
        .catch(() => {
          // Silent fail - session will be handled by normal flow
        })
    }

    if (!isStandalone) return

    // Don't redirect if user just logged out
    if (sessionStorage.getItem('justLoggedOut') === 'true') {
      return
    }

    // If we have a session, ensure we're on the right page
    if (status === 'authenticated' && session?.user?.id) {
      const currentPath = window.location.pathname
      
      // If we're on the login page but have a session, redirect to dashboard
      if (currentPath.startsWith('/auth/signin')) {
        // Get user role hints to determine redirect
        const roleHints = (session.user as any)?.roleHints as {
          isOwner?: boolean
          orgAdminOf?: string[]
          orgStaffOf?: string[]
          isParent?: boolean
        } | undefined

        if (roleHints) {
          let redirectPath = '/'
          if (roleHints.isParent) {
            redirectPath = '/parent/dashboard'
          } else if (roleHints.isOwner) {
            redirectPath = '/owner/overview'
          } else if (roleHints.orgAdminOf?.length || roleHints.orgStaffOf?.length) {
            redirectPath = '/dashboard'
          }
          
          if (redirectPath !== currentPath) {
            router.push(redirectPath)
          }
        }
      }
    }
  }, [session, status, router, update, hasChecked])

  return null
}

