'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Something went wrong!
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          We encountered an unexpected error. Please try again or return to the home page.
        </p>
        {error.digest && (
          <p className="mb-4 text-xs text-[var(--muted-foreground)]">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default" className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

