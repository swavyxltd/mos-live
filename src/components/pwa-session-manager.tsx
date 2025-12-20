'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { isPWAMode, setPWALoginPreference, getPWALoginPreference, clearPWALoginPreference } from '@/lib/pwa-auth'
import { FullScreenLoader } from '@/components/loading/full-screen-loader'

/**
 * Manages PWA session extension and restoration
 * Only active in PWA mode
 */
export function PWASessionManager() {
  const { data: session, status } = useSession()
  const [isCheckingSession, setIsCheckingSession] = useState(false)
  const [isPWA, setIsPWA] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const pwaMode = isPWAMode()
    setIsPWA(pwaMode)

    // Only run PWA session logic in PWA mode
    if (!pwaMode) {
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const checkAndRestoreSession = async () => {
      // If we have an active session, extend it for PWA
      if (status === 'authenticated' && session?.user?.id) {
        // Always clear loading state when authenticated
        setIsCheckingSession(false)
        
        // Check if we've already extended this session
        const alreadyExtended = document.cookie.includes('pwa-mode=true')
        
        if (!alreadyExtended) {
          setIsCheckingSession(true)
          
          try {
            // Store PWA login preference
            setPWALoginPreference(session.user.id)
            
            // Extend the session cookie to 90 days
            await fetch('/api/auth/extend-pwa-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-pwa-mode': 'true',
              },
            })
          } catch (error) {
            console.error('Failed to extend PWA session:', error)
          } finally {
            setIsCheckingSession(false)
          }
        }
        return
      }

      // If session is loading, show loading screen briefly with timeout
      if (status === 'loading') {
        const preference = getPWALoginPreference()
        if (preference && preference.userId) {
          // We have a remembered login, show loading while checking
          setIsCheckingSession(true)
          
          // Set a timeout to clear loading after 5 seconds max
          timeoutRef.current = setTimeout(() => {
            setIsCheckingSession(false)
          }, 5000)
        } else {
          // No preference, don't show loading
          setIsCheckingSession(false)
        }
        return
      }

      // If no session but we're in PWA mode, check for remembered login
      if (status === 'unauthenticated') {
        // Always clear loading when unauthenticated
        setIsCheckingSession(false)
        
        const preference = getPWALoginPreference()
        
        if (preference && preference.userId) {
          // We have a remembered login preference but no active session
          // Session might have expired - clear the preference
          clearPWALoginPreference()
        }
      }
    }

    checkAndRestoreSession()

    // Cleanup timeout on unmount or status change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [session, status])

  // Show loading screen while checking PWA session
  if (isPWA && isCheckingSession) {
    return <FullScreenLoader />
  }

  return null
}

