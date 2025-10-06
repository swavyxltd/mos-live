'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Bell, Grid3X3, Maximize2 } from 'lucide-react'

interface TopbarProps {
  title: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Topbar({ title, breadcrumbs, user }: TopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
      {/* Left side - Title and breadcrumbs */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm text-[var(--muted-foreground)]">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span>/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-[var(--foreground)]">
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Right side - Search and actions */}
      <div className="flex items-center space-x-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search..."
            className="pl-10 w-64 rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--background)]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Grid3X3 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>

        {/* User avatar */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {user.image ? (
                <img className="h-8 w-8 rounded-full" src={user.image} alt={user.name || ''} />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-[var(--foreground)]">{user.name || user.email}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
