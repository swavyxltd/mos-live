'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { X, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AddToHomeScreenPrompt() {
  const { data: session, status } = useSession()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  // Function to check if app is installed/standalone
  const checkIfInstalled = useCallback(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return false
    }

    // Check for standalone display mode (most reliable)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      (typeof document !== 'undefined' && document.referrer.includes('android-app://')) ||
      // Additional iOS checks
      (window.matchMedia('(display-mode: fullscreen)').matches && 
       /iPad|iPhone|iPod/.test(navigator.userAgent))

    if (isStandaloneMode) {
      // Mark as installed if we detect standalone mode
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pwa-installed', 'true')
      }
      setIsStandalone(true)
      return true
    }

    setIsStandalone(false)
    return false
  }, [])

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return
    }

    // Only show for logged-in users
    if (status !== 'authenticated' || !session?.user) {
      return
    }

    // Check if already installed (standalone mode)
    const isInstalled = checkIfInstalled()

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if already dismissed or marked as installed
    const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem('pwa-install-dismissed') === 'true'
    const markedAsInstalled = typeof localStorage !== 'undefined' && localStorage.getItem('pwa-installed') === 'true'

    // Don't show if already installed, dismissed, or marked as installed
    if (isInstalled || dismissed || markedAsInstalled) {
      return
    }

    // For iOS, show prompt after a delay
    if (iOS) {
      const timer = setTimeout(() => {
        // Double-check if installed before showing
        if (!checkIfInstalled() && typeof localStorage !== 'undefined' && localStorage.getItem('pwa-installed') !== 'true') {
          setShowPrompt(true)
          // Trigger animation after state update
          setTimeout(() => setIsAnimating(true), 10)
        }
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }

    // For Android/Chrome, listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Double-check if installed before showing
      if (!checkIfInstalled() && typeof localStorage !== 'undefined' && localStorage.getItem('pwa-installed') !== 'true') {
        e.preventDefault()
        setDeferredPrompt(e)
        setShowPrompt(true)
        setTimeout(() => setIsAnimating(true), 10)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Also check on visibility change (when user switches back to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIfInstalled()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, status, checkIfInstalled])

  // Prevent body scroll when prompt is open
  useEffect(() => {
    if (showPrompt && isAnimating) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [showPrompt, isAnimating])

  // Continuously check if app becomes installed (when user opens from home screen)
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return
    }

    const checkInterval = setInterval(() => {
      if (checkIfInstalled()) {
        // If we detect standalone mode, hide the prompt immediately
        setShowPrompt(false)
        setIsAnimating(false)
      }
    }, 1000) // Check every second

    // Also check on page focus/visibility
    const handleFocus = () => {
      if (checkIfInstalled()) {
        setShowPrompt(false)
        setIsAnimating(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(checkInterval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [checkIfInstalled])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        handleClose()
      }
      
      setDeferredPrompt(null)
    } else if (isIOS) {
      // iOS - just close, user will follow instructions
      // Mark as installed - when they actually install and open from home screen,
      // the standalone detection will confirm it
      localStorage.setItem('pwa-installed', 'true')
      handleClose()
    }
  }

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setShowPrompt(false)
    }, 300) // Wait for animation to complete
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    handleClose()
  }

  // Only show on mobile devices
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Check if installed before rendering (without calling checkIfInstalled to avoid re-renders)
  const markedAsInstalled = typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('pwa-installed') === 'true'

  if (!showPrompt || !isMobile || isStandalone || markedAsInstalled || status !== 'authenticated') {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-[var(--card)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl max-w-md mx-auto">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-[var(--muted-foreground)]/30 rounded-full" />
          </div>

          {/* Content */}
          <div className="px-5 pb-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Install Madrasah OS
                </h3>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-[var(--accent)] transition-colors flex-shrink-0 ml-2"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <p className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed">
                {isIOS ? (
                  <>
                    Get quick access from your home screen. Tap{' '}
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--foreground)]">
                      <Share2 className="h-4 w-4 inline" />
                    </span>{' '}
                    then &quot;Add to Home Screen&quot;.
                  </>
                ) : (
                  <>
                    Install our app for faster access, offline support, and a better experience. 
                    Get quick access right from your home screen.
                  </>
                )}
              </p>

              {/* iOS Share Icon Visual Guide */}
              {isIOS && (
                <div className="flex items-center gap-3 p-3 bg-[var(--muted)]/50 rounded-lg border border-[var(--border)]">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                      <Share2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--foreground)] mb-0.5">
                      Look for the Share button
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Usually at the bottom of your browser
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1 border-[var(--border)] hover:bg-[var(--accent)]"
              >
                Later
              </Button>
              {!isIOS && (
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
                >
                  Install Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

