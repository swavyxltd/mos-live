'use client'

import * as React from 'react'
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

export function Topbar({ title, user, userRole }: TopbarProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const firstName = user?.name?.split(' ')[0] || 'User'

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    // You can implement actual dark mode logic here
    document.documentElement.classList.toggle('dark')
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
          className="h-10 w-10 hover:bg-gray-100 hover:scale-105 transition-all duration-200"
          onClick={toggleDarkMode}
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
