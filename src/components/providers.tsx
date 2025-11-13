'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { ReactNode } from 'react'

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
      {children}
      <Toaster />
    </SessionProvider>
  )
}
