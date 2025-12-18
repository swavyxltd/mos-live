'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const { data: session } = useSession()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Only show for logged-in users
    if (!session?.user?.id) {
      return
    }

    // Check if already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
    
    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // Don't show if already installed
    if (isStandaloneMode) {
      return
    }

    // Don't show if dismissed within the last week
    if (dismissedTime > oneWeekAgo) {
      return
    }

    // Handle beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    // For iOS, show prompt after a delay
    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }

    // For Android/Chrome
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [session])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } else if (isIOS) {
      // iOS - show instructions
      // The prompt will be handled by showing instructions
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or no session
  if (!showPrompt || isStandalone || !session?.user?.id) {
    return null
  }

  // Only show on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (!isMobile) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Madrasah OS</h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mb-3">
              Tap the share button <span className="inline-block">📤</span> and select &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              Install our app for a better experience with quick access and offline support.
            </p>
          )}
          <div className="flex gap-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                size="sm"
                className="text-xs"
              >
                Install
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

