'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

// iOS-style share icon (square with arrow pointing up)
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Square base */}
      <rect x="3" y="11" width="12" height="12" rx="2" fill="none" />
      {/* Arrow pointing up */}
      <path d="M9 7l3-3 3 3" fill="none" />
      <line x1="12" y1="4" x2="12" y2="11" fill="none" />
    </svg>
  )
}

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
  const [isAnimating, setIsAnimating] = useState(false)

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
      setTimeout(() => setIsAnimating(true), 100)
    }

    // For iOS, show prompt after a delay
    if (iOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
        setTimeout(() => setIsAnimating(true), 100)
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
    setIsAnimating(false)
    setTimeout(() => {
      setShowPrompt(false)
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }, 200)
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
    <div 
      className={`fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 transition-all duration-300 ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="relative bg-white border-2 border-green-200 rounded-xl shadow-2xl overflow-hidden">
        {/* Decorative background elements with green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-5 bg-white/95">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-gray-900">
                  Install Madrasah OS
                </h3>
                <Sparkles className="h-4 w-4 text-green-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed break-words w-full">
                {isIOS ? (
                  <>
                    Get quick access from your home screen. Tap <ShareIcon className="inline h-4 w-4 mx-0.5 align-middle text-gray-600" /> then &quot;Add to Home Screen&quot;
                  </>
                ) : (
                  <>
                    Install our app for faster access, offline support, and a better mobile experience.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white/50"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Install Now
              </Button>
            )}
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="flex-shrink-0 border-gray-300 hover:bg-white/80"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

