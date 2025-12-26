'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

function ParentSetupRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      router.push('/auth/signin?error=InvalidToken')
      return
    }

    // Redirect to parent signup with token - the signup page will handle fetching invitation details
    router.push(`/parent/signup?token=${token}`)
  }, [token, router])

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-600">Loading your invitation...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ParentSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/auth-bg.png)'
          }}
        />
        <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
          <div className="flex w-full max-w-md flex-col gap-6">
            <a href="/" className="flex items-center gap-2 self-center">
              <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
            </a>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    }>
      <ParentSetupRedirect />
    </Suspense>
  )
}

