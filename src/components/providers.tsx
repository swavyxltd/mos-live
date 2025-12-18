'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ReactNode } from 'react'
import { TopProgressBar } from '@/components/loading/top-progress-bar'
import { InstallPrompt } from '@/components/pwa/install-prompt'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      refetchInterval={0} // Don't auto-refetch - rely on cookie persistence
      refetchOnWindowFocus={false} // Don't refetch on focus - can cause logout issues
      refetchWhenOffline={false}
    >
      <TopProgressBar />
      {children}
      <InstallPrompt />
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </SessionProvider>
  )
}
