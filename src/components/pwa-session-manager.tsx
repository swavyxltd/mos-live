'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
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

  useEffect(() => {
    const pwaMode = isPWAMode()
    setIsPWA(pwaMode)

    // Only run PWA session logic in PWA mode
    if (!pwaMode) {
      return
    }

    const checkAndRestoreSession = async () => {
      // If we have an active session, extend it for PWA
      if (status === 'authenticated' && session?.user?.id) {
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

      // If session is loading, show loading screen briefly
      if (status === 'loading') {
        const preference = getPWALoginPreference()
        if (preference && preference.userId) {
          // We have a remembered login, show loading while checking
          setIsCheckingSession(true)
          // Will be cleared when status changes
        }
        return
      }

      // If no session but we're in PWA mode, check for remembered login
      if (status === 'unauthenticated') {
        const preference = getPWALoginPreference()
        
        if (preference && preference.userId) {
          // We have a remembered login preference but no active session
          // Session might have expired - clear the preference
          clearPWALoginPreference()
        }
      }
    }

    checkAndRestoreSession()
  }, [session, status])

  // Show loading screen while checking PWA session
  if (isPWA && isCheckingSession) {
    return <FullScreenLoader />
  }

  return null
}

