'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Only show for logged-in users
    if (status !== 'authenticated' || !session?.user) {
      return
    }

    // Check if already installed (standalone mode)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    const isInstalled = localStorage.getItem('pwa-installed') === 'true'

    if (isStandaloneMode || dismissed || isInstalled) {
      return
    }

    // For iOS, show prompt after a delay
    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
        // Trigger animation after state update
        setTimeout(() => setIsAnimating(true), 10)
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }

    // For Android/Chrome, listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
      setTimeout(() => setIsAnimating(true), 10)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [session, status])

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
      handleClose()
      localStorage.setItem('pwa-installed', 'true')
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

  if (!showPrompt || !isMobile || isStandalone || status !== 'authenticated') {
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

