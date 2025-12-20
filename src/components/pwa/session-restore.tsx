'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Simple component to restore session on PWA app open
 * Only runs once on mount - no aggressive restoration
 */
export function SessionRestore() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Only run in PWA standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')

    if (!isStandalone) return

    // Check if user just logged out - don't auto-redirect in this case
    const urlParams = new URLSearchParams(window.location.search)
    const loggedOut = urlParams.get('loggedOut') === 'true'
    
    if (loggedOut) return

    // Only redirect if we have a valid session and we're on the login page
    // This runs once on mount - no aggressive restoration
    if (status === 'authenticated' && session?.user?.id) {
      const currentPath = window.location.pathname
      
      if (currentPath.startsWith('/auth/signin')) {
        const roleHints = (session.user as any)?.roleHints as {
          isOwner?: boolean
          orgAdminOf?: string[]
          orgStaffOf?: string[]
          isParent?: boolean
        } | undefined

        if (roleHints) {
          let redirectPath = '/'
          if (roleHints.isParent) {
            redirectPath = '/parent/dashboard'
          } else if (roleHints.isOwner) {
            redirectPath = '/owner/overview'
          } else if (roleHints.orgAdminOf?.length || roleHints.orgStaffOf?.length) {
            redirectPath = '/dashboard'
          }
          
          if (redirectPath !== currentPath) {
            router.push(redirectPath)
          }
        }
      }
    }
  }, []) // Only run once on mount

  return null
}
