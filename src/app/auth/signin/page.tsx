'use client'

import { signIn, getSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import { getPostLoginRedirect } from '@/lib/auth'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if ((session?.user as any)?.roleHints) {
        const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
        window.location.href = redirectUrl
      }
    })
  }, [callbackUrl])

  const handleCredentialsSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: callbackUrl
      })
      
      if (result?.error) {
        setError('Invalid email or password')
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
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      {/* Logo above card - 30% of card width */}
      <div className="mb-6 flex justify-center">
        <img 
          src="/logo.png" 
          alt="Madrasah OS" 
          className="w-[132px] h-auto"
        />
      </div>
      
      {/* White card with soft shadow */}
      <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Sign in with email
          </h1>
          <p className="text-sm text-neutral-600">
            Access your Madrasah OS dashboard.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          {/* Email input */}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Email"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-12 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
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
            <div className="mt-2 text-right">
              <a
                href="#"
                className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Forgot password?
              </a>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  )
}
