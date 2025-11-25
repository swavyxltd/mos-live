'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-[var(--background)]">
          <Card className="w-full max-w-md p-8 text-center">
            <div className="mb-4 flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
              Application Error
            </h1>
            <p className="mb-6 text-[var(--muted-foreground)]">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
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
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="outline" 
                className="w-full sm:w-auto"
              >
                <Home className="mr-2 h-4 w-4" />
                Go home
              </Button>
            </div>
          </Card>
        </div>
      </body>
    </html>
  )
}

