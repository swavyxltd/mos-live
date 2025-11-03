import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Soft overlay */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/10" />
      
      {/* Content - centered with grid */}
      <div className="relative z-10 w-full grid place-items-center">
        {children}
      </div>
    </div>
  )
}

