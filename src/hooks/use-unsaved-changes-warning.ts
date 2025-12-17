'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UseUnsavedChangesWarningOptions {
  /**
   * Function that returns true if there are unsaved changes
   */
  hasUnsavedChanges: () => boolean
  /**
   * Whether the warning should be enabled (e.g., disable when loading initial data)
   */
  enabled?: boolean
  /**
   * Custom message for the warning dialog
   */
  message?: string
}

/**
 * Hook to warn users before leaving a page with unsaved changes
 * Handles:
 * - Browser refresh/close (beforeunload)
 * - Browser back/forward buttons (popstate)
 * - Navigation link clicks
 */
export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  enabled = true,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesWarningOptions) {
  const router = useRouter()
  const isSavingRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Warn before leaving page (refresh, close tab, etc.)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges() && !isSavingRef.current) {
        e.preventDefault()
        e.returnValue = message
        return e.returnValue
      }
    }

    // Warn before navigating away with browser back/forward buttons
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges() && !isSavingRef.current) {
        const confirmed = window.confirm(message)
        if (!confirmed) {
          // Push the current URL back to prevent navigation
          window.history.pushState(null, '', window.location.href)
        }
      }
    }

    // Warn before clicking navigation links
    const handleClick = (e: MouseEvent) => {
      // Only check navigation links, not form buttons or other interactive elements
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      
      if (link && hasUnsavedChanges() && !isSavingRef.current) {
        const href = (link as HTMLAnchorElement).href
        const currentUrl = window.location.href.split('?')[0] // Remove query params for comparison
        const linkUrl = href.split('?')[0]
        
        // Only intercept if it's navigating to a different page (not same page anchor links)
        const isNavigationLink = linkUrl !== currentUrl && !href.includes('#')
        
        if (isNavigationLink) {
          const confirmed = window.confirm(message)
          if (!confirmed) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClick, true)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClick, true)
    }
  }, [hasUnsavedChanges, enabled, message])

  return {
    /**
     * Call this before starting a save operation to prevent warnings during save
     */
    startSaving: () => {
      isSavingRef.current = true
    },
    /**
     * Call this after save completes (success or failure) to re-enable warnings
     */
    finishSaving: () => {
      isSavingRef.current = false
    }
  }
}
