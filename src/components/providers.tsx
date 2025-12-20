'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ReactNode } from 'react'
import { TopProgressBar } from '@/components/loading/top-progress-bar'
import { PWASessionManager } from '@/components/pwa-session-manager'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      refetchInterval={0} 
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <PWASessionManager />
      <TopProgressBar />
      {children}
      <Toaster />
      <Analytics />
      <SpeedInsights />
    </SessionProvider>
  )
}
