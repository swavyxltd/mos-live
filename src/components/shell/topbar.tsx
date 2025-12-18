'use client'

import * as React from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Sun, Moon } from 'lucide-react'
import { GlobalSearch } from '@/components/global-search'

interface TopbarProps {
  title: string
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  userRole?: string
}

export function Topbar({ title, user: initialUser, userRole }: TopbarProps) {
  const { data: session, status } = useSession()
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  
  // Use session data if available (fresh from client), otherwise fall back to initial user prop
  // Always prioritize session data when it's loaded to ensure we get the latest from database
  const user = (session?.user && status === 'authenticated') ? {
    name: session.user.name || initialUser?.name,
    email: session.user.email || initialUser?.email,
    image: session.user.image || initialUser?.image
  } : initialUser
  
  const firstName = user?.name?.split(' ')[0] || 'User'

  // Check dark mode state after hydration to avoid mismatch
  React.useEffect(() => {
    setMounted(true)
    // Load dark mode preference from localStorage
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (prefersDark) {
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setIsDarkMode(false)
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
      {/* Left side - Greeting */}
      <div className="flex items-center space-x-4">
        <div>
          {/* Mobile: 2 lines, Desktop: 1 line */}
          <h1 className="md:hidden text-base font-semibold text-[var(--foreground)] leading-tight">
            Assalamu'alaikum,<br />{firstName}
          </h1>
          <h1 className="hidden md:block text-base sm:text-xl font-semibold text-[var(--foreground)] whitespace-nowrap sm:whitespace-normal">
            Assalamu'alaikum, {firstName}
          </h1>
        </div>
      </div>

      {/* Spacer to increase gap - mobile only */}
      <div className="flex-1 min-w-[2rem] sm:hidden"></div>

      {/* Right side - Search and Dark Mode */}
      <div className="flex items-center space-x-4">
        {/* Global Search - Hidden for parent users */}
        {userRole !== 'PARENT' && <GlobalSearch />}
        
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 hover:bg-gray-100"
          onClick={toggleDarkMode}
        >
          {mounted && isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
