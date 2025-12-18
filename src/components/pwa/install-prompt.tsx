'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, Smartphone, Download, Sparkles, ArrowUp } from 'lucide-react'
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
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 dark:bg-blue-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 dark:bg-indigo-800/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-5">
          {/* Header with icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                  Install Madrasah OS
                </h3>
                <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {isIOS ? (
                  <>
                    Get quick access from your home screen. Tap <ArrowUp className="inline h-3 w-3 mx-0.5" /> then &quot;Add to Home Screen&quot;
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
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Benefits list */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Faster loading times</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Home screen access</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
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
              className="flex-shrink-0 border-gray-300 dark:border-gray-700 hover:bg-white/80 dark:hover:bg-gray-800/80"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

