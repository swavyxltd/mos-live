'use client'

import { signIn, getSession, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import Image from 'next/image'
import { LogIn } from 'lucide-react'
import { getPostLoginRedirect } from '@/lib/auth'
import { LoginForm } from '@/components/login-form'

function SignInPageContent() {
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const sessionCheckedRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const redirectCheckedRef = useRef(false)
  
  // Get URL params once and memoize
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const resetSuccess = searchParams.get('reset') === 'success'
  const signupSuccess = searchParams.get('signup') === 'success'

  // Check if user is already signed in and redirect them
  useEffect(() => {
    if (redirectCheckedRef.current) return
    if (status === 'loading') return // Wait for session to load
    
    if (status === 'authenticated' && session?.user?.id) {
      redirectCheckedRef.current = true
      
      // Get role hints to determine correct dashboard
      const roleHints = (session.user as any)?.roleHints as {
        isOwner?: boolean
        orgAdminOf?: string[]
        orgStaffOf?: string[]
        isParent?: boolean
        staffSubrole?: string | null
      } | undefined
      
      if (roleHints) {
        const redirectUrl = getPostLoginRedirect({
          isOwner: roleHints.isOwner || false,
          orgAdminOf: roleHints.orgAdminOf || [],
          orgStaffOf: roleHints.orgStaffOf || [],
          isParent: roleHints.isParent || false,
          staffSubrole: roleHints.staffSubrole || null
        })
        // Use window.location.href for immediate redirect
        window.location.href = redirectUrl
      } else {
        // Fallback to dashboard if roleHints are missing
        window.location.href = '/dashboard'
      }
    }
  }, [status, session])

  // Initialize success messages only once
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    
    // Handle success messages
    if (resetSuccess) {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
    }
    if (signupSuccess) {
      setSuccessMessage('Account created successfully! Please sign in to continue.')
    }
  }, []) // Empty deps - only run once on mount

  const handleCredentialsSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      // First, verify password via custom API route
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password')
        setIsLoading(false)
        return
      }

      // If 2FA is required, redirect to verification page
      if (data.requiresTwoFactor && data.pendingUserId) {
        // Store pending user ID in sessionStorage for 2FA page
        sessionStorage.setItem('pendingUserId', data.pendingUserId)
        sessionStorage.setItem('pendingEmail', email)
        window.location.href = `/auth/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`
        return
      }

      // No 2FA needed - complete signin with NextAuth
      if (data.success && data.userId) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
          callbackUrl: callbackUrl
        })

        if (result?.error) {
          console.error('[SignIn] NextAuth error:', result.error, result)
          // In development, show more details
          if (process.env.NODE_ENV === 'development') {
            setError(`Sign in error: ${result.error}. Check console for details.`)
          } else {
            setError('An error occurred during sign in')
          }
          setIsLoading(false)
          return
        } else if (result?.ok) {
          // Get session to check user role and redirect appropriately
          const session = await getSession()
          
          // Always extend session cookie to 30 days for both browser and PWA
          // This ensures the cookie persists across browser sessions
          if (session?.user?.id) {
            try {
              // Check if PWA mode
              const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone === true ||
                           document.referrer.includes('android-app://')
              
              if (isPWA) {
                // Store PWA login preference
                if (typeof window !== 'undefined') {
                  const { setPWALoginPreference } = await import('@/lib/pwa-auth')
                  setPWALoginPreference(session.user.id)
                }
                
                // Extend session cookie to 30 days (PWA)
                await fetch('/api/auth/extend-pwa-session', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-pwa-mode': 'true',
                  },
                })
              } else {
                // Extend session cookie to 30 days (regular browser)
                await fetch('/api/auth/extend-session', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
              }
            } catch (error) {
              console.error('Failed to extend session:', error)
              // Continue with normal redirect even if extension fails
            }
          }
          
          if ((session?.user as any)?.roleHints) {
            const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
            window.location.href = redirectUrl
          } else {
            window.location.href = '/auth/signin'
          }
        } else {
          // No error but also not ok - might be a redirect issue
          console.warn('[SignIn] Unexpected result:', result)
          setError('An error occurred during sign in')
        }
      }
    } catch (error: any) {
      console.error('[SignIn] Unexpected error:', error)
      setError('An error occurred during sign in')
      if (process.env.NODE_ENV === 'development') {
        setError(`Error: ${error?.message || 'Unknown error'}. Check console for details.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while checking session
  if (status === 'loading' || (status === 'authenticated' && !redirectCheckedRef.current)) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={166}
              height={42}
              className="h-[42px] w-auto"
              priority
            />
          </div>
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  // Don't render sign-in form if user is authenticated (redirect is in progress)
  if (status === 'authenticated' && redirectCheckedRef.current) {
    return null
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {/* Logo/Branding */}
          <a href="/" className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={166}
              height={42}
              className="h-[42px] w-auto"
              priority
              fetchPriority="high"
            />
          </a>

          {/* Login Form */}
          <LoginForm
            onSubmit={handleCredentialsSignIn}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
          />
        </div>
      </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={166}
              height={42}
              className="h-[42px] w-auto"
              priority
            />
          </div>
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  )
}
