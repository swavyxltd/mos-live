'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { X, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AddToHomeScreenPrompt() {
  const { data: session, status } = useSession()
  const [showPrompt, setShowPrompt] = useState(false)
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
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }

    // For Android/Chrome, listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [session, status])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        setShowPrompt(false)
      }
      
      setDeferredPrompt(null)
    } else if (isIOS) {
      // iOS - just show instructions
      // The prompt will guide users to use the share button
      setShowPrompt(false)
      localStorage.setItem('pwa-installed', 'true')
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setShowPrompt(false)
  }

  // Only show on mobile devices
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (!showPrompt || !isMobile || isStandalone || status !== 'authenticated') {
    return null
  }

  return (
    <Card className="mb-6 border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Download className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                Add to Home Screen
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                {isIOS ? (
                  <>
                    Tap the share button <span className="font-mono text-xs">□↑</span> and select &quot;Add to Home Screen&quot; for quick access.
                  </>
                ) : (
                  <>
                    Install Madrasah OS on your device for a better experience and quick access.
                  </>
                )}
              </p>
              {!isIOS && (
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
            aria-label="Dismiss prompt"
          >
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

