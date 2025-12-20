'use client'

import { signIn, getSession, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import Image from 'next/image'
import { getPostLoginRedirect } from '@/lib/auth'
import { LoginForm } from '@/components/login-form'
import { SessionCheckLoader } from '@/components/loading/session-check-loader'

function SignInPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const hasInitializedRef = useRef(false)
  
  // Get URL params once and memoize
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const resetSuccess = searchParams.get('reset') === 'success'
  const signupSuccess = searchParams.get('signup') === 'success'

  // Check for existing session on mount (for PWA session restoration)
  useEffect(() => {
    // Don't check session if user just logged out
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true'
    if (justLoggedOut) {
      // Clear the flag and show login form
      sessionStorage.removeItem('justLoggedOut')
      setCheckingSession(false)
      return
    }

    // Add timeout to prevent infinite loading (max 5 seconds)
    const timeout = setTimeout(() => {
      setCheckingSession(false)
    }, 5000)

    // Wait for session to load
    if (status === 'loading') {
      return () => clearTimeout(timeout)
    }

    // If we have a session, redirect to dashboard
    if (status === 'authenticated' && session?.user?.id) {
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
        
        clearTimeout(timeout)
        // Show loading screen briefly, then redirect
        setTimeout(() => {
          router.push(redirectPath)
        }, 500) // Small delay to show loading screen
        return
      }
    }

    // No session or session check complete - show login form
    clearTimeout(timeout)
    setCheckingSession(false)

    return () => clearTimeout(timeout)
  }, [session, status, router])

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

  // Show loading screen while checking session
  if (checkingSession || status === 'loading') {
    return <SessionCheckLoader />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {/* Logo/Branding */}
          <a href="/" className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={128}
              height={32}
              className="h-8 w-auto"
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
              width={128}
              height={32}
              className="h-8 w-auto"
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
