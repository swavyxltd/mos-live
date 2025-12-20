'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ReactNode } from 'react'
import { TopProgressBar } from '@/components/loading/top-progress-bar'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { SessionRestore } from '@/components/pwa/session-restore'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      refetchInterval={0} // Don't auto-refetch - let cookies handle persistence
      refetchOnWindowFocus={false} // Don't refetch on focus - simple login/logout
      refetchWhenOffline={false}
      basePath="/api/auth"
    >
      <TopProgressBar />
      <SessionRestore />
      {children}
      <InstallPrompt />
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </SessionProvider>
  )
}
