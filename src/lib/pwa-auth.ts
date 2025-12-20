/**
 * PWA Authentication Utilities
 * Handles extended session (90 days) for PWA installations only
 */

/**
 * Check if the app is running in PWA/standalone mode
 */
export function isPWAMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Check for standalone display mode
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')

  return isStandalone
}

/**
 * Store PWA login preference
 */
export function setPWALoginPreference(userId: string): void {
  if (typeof window === 'undefined') return
  
  const data = {
    userId,
    timestamp: Date.now(),
    expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
  }
  
  localStorage.setItem('pwa-login-preference', JSON.stringify(data))
}

/**
 * Get PWA login preference
 */
export function getPWALoginPreference(): { userId: string; expiresAt: number } | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('pwa-login-preference')
  if (!stored) return null
  
  try {
    const data = JSON.parse(stored)
    
    // Check if expired
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem('pwa-login-preference')
      return null
    }
    
    return data
  } catch {
    return null
  }
}

/**
 * Clear PWA login preference
 */
export function clearPWALoginPreference(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('pwa-login-preference')
}

