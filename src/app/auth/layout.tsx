import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
      {/* Background image - clean, no overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Content - centered with grid */}
      <div className="relative z-10 w-full grid place-items-center">
        {children}
      </div>
    </div>
  )
}

