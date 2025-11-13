'use client'

import { signIn, getSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import { getPostLoginRedirect } from '@/lib/auth'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const resetSuccess = searchParams.get('reset') === 'success'
  const signupSuccess = searchParams.get('signup') === 'success'

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if ((session?.user as any)?.roleHints) {
        const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
        window.location.href = redirectUrl
      }
    })

    // Show success message if redirected from password reset
    if (resetSuccess) {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
      // Clear the query parameter
      window.history.replaceState({}, '', '/auth/signin')
    }

    // Show success message if redirected from signup
    if (signupSuccess) {
      setSuccessMessage('Account created successfully! Please sign in to continue.')
      // Clear the query parameter
      window.history.replaceState({}, '', '/auth/signin')
    }
  }, [callbackUrl, resetSuccess, signupSuccess])

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
          setError('An error occurred during sign in')
        } else if (result?.ok) {
          // Get session to check user role and redirect appropriately
          const session = await getSession()
          if ((session?.user as any)?.roleHints) {
            const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
            window.location.href = redirectUrl
          } else {
            window.location.href = '/auth/signin'
          }
        }
      }
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Logo above card */}
      <div className="mb-6 flex justify-center">
        <img 
          src="/logo.png" 
          alt="Madrasah OS" 
          className="w-[198px] h-auto"
        />
      </div>
      
      {/* White card matching 2FA verification page style */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <LogIn className="h-5 w-5 text-gray-700" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 text-center">
              Assalamu alaykum
            </h2>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Login to your Madrasah account
          </p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Success message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-6">
            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 h-11 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder="m@example.com"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-sm text-gray-900 hover:text-gray-700 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 pr-12 h-11 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-colors"
                  placeholder=""
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
