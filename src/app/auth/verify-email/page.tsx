'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    // Verify email
    fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setStatus('error')
          setMessage(data.error)
        } else {
          setStatus('success')
          setMessage('Your email has been verified! Redirecting to sign in...')
          setTimeout(() => {
            router.push('/auth/signin?verified=true')
          }, 2000)
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('An error occurred. Please try again.')
      })
  }, [token, email, router])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center">
          <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority />
        </a>

        <div className="text-center py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-neutral-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verifying Email</h2>
              <p className="text-sm text-neutral-600">Please wait...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">Email Verified</h2>
              <p className="text-sm text-neutral-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">Verification Failed</h2>
              <p className="text-sm text-neutral-600 mb-4">{message}</p>
              <a
                href="/auth/signin"
                className="text-sm text-neutral-900 hover:underline"
              >
                Go to Sign In
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority />
          </a>
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-neutral-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

