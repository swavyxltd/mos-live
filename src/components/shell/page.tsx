'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

interface PageProps {
  children: React.ReactNode
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
  }
  org: {
    id: string
    name: string
    slug: string
  }
  userRole: string
  title: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Page({ children, user, org, userRole, title, breadcrumbs }: PageProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar user={user} org={org} userRole={userRole} />
      <div className="sm:pl-64">
        <Topbar title={title} breadcrumbs={breadcrumbs} user={user} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
