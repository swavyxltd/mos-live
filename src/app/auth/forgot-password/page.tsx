'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
        return
      }

      setSuccess(true)
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      {/* Logo above card */}
      <div className="mb-6 flex justify-center">
        <img 
          src="/logo.png" 
          alt="Madrasah OS" 
          className="w-[198px] h-auto"
        />
      </div>
      
      {/* White card with soft shadow */}
      <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Reset your password
          </h1>
          <p className="text-sm text-neutral-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            Password reset email sent! Please check your inbox.
          </div>
        )}

        {/* Form */}
        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Back to sign in */}
        <div className="mt-6 text-center">
          <a
            href="/auth/signin"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            ← Back to sign in
          </a>
        </div>
      </div>
    </div>
  )
}

