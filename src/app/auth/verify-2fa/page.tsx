'use client'

import { signIn, getSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { Mail, Shield } from 'lucide-react'
import { getPostLoginRedirect } from '@/lib/auth'

function Verify2FAContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Get pending user info from sessionStorage
    const storedUserId = sessionStorage.getItem('pendingUserId')
    const storedEmail = sessionStorage.getItem('pendingEmail')

    if (!storedUserId || !storedEmail) {
      // No pending 2FA - redirect to signin
      router.push('/auth/signin')
      return
    }

    setPendingUserId(storedUserId)
    setEmail(storedEmail)

    // Check if already signed in
    getSession().then((session) => {
      if ((session?.user as any)?.roleHints) {
        const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
        window.location.href = redirectUrl
      }
    })
  }, [router])

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      const newCode = [...code]
      digits.forEach((digit, index) => {
        if (index < 6) {
          newCode[index] = digit
        }
      })
      setCode(newCode)
      setError('')
      // Focus last input
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    if (!pendingUserId) {
      setError('Session expired. Please sign in again.')
      router.push('/auth/signin')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Verify 2FA code
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twoFactorCode: fullCode,
          pendingUserId
        })
      })

      const data = await response.json()

      if (!response.ok || !data.twoFactorVerified) {
        setError(data.error || 'Invalid or expired verification code')
        // Clear code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        setIsLoading(false)
        return
      }

      // 2FA verified - get signin token
      const sessionResponse = await fetch('/api/auth/complete-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId })
      })

      const sessionData = await sessionResponse.json()

      if (!sessionResponse.ok || !sessionData.success) {
        setError(sessionData.error || 'Failed to complete sign in. Please try again.')
        setIsLoading(false)
        return
      }

      // Use the signin token to complete NextAuth signin
      const userEmail = sessionStorage.getItem('pendingEmail')
      if (!userEmail) {
        setError('Session expired. Please sign in again.')
        router.push('/auth/signin')
        return
      }

      // Complete signin with NextAuth using the signin token
      const result = await signIn('credentials', {
        email: userEmail,
        password: sessionData.signinToken, // Use token as password
        redirect: false,
        callbackUrl: callbackUrl
      })

      // Clear sessionStorage
      sessionStorage.removeItem('pendingUserId')
      sessionStorage.removeItem('pendingEmail')

      if (result?.error) {
        setError('Failed to complete sign in. Please try again.')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // Get session and redirect
        const session = await getSession()
        if ((session?.user as any)?.roleHints) {
          const redirectUrl = getPostLoginRedirect((session.user as any).roleHints)
          window.location.href = redirectUrl || callbackUrl
        } else {
          window.location.href = callbackUrl
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!pendingUserId || !email) {
      setError('Session expired. Please sign in again.')
      router.push('/auth/signin')
      return
    }

    setIsResending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to resend code. Please try again.')
      } else {
        setError('')
        // Show success message
        alert('Verification code sent to your email')
      }
    } catch (error) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
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
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Verify Your Identity
          </h1>
          <p className="text-sm text-neutral-600">
            We've sent a 6-digit verification code to
          </p>
          {email && (
            <p className="text-sm font-medium text-neutral-900 mt-1 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {email}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Code input form */}
        <form onSubmit={handleVerify} className="space-y-6">
          {/* Code inputs */}
          <div className="flex justify-center gap-3">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                disabled={isLoading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || code.join('').length !== 6}
            className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>

          {/* Resend code */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
          </div>

          {/* Back to signin */}
          <div className="text-center pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('pendingUserId')
                sessionStorage.removeItem('pendingEmail')
                router.push('/auth/signin')
              }}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              ← Back to sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Madrasah OS" 
            className="w-[198px] h-auto"
          />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 animate-pulse">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-neutral-600">Loading verification page...</p>
          </div>
        </div>
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  )
}

