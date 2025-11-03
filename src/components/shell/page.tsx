'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OverduePaymentBanner } from '@/components/overdue-payment-banner'
import { PaymentRequiredBanner } from '@/components/payment-required-banner'

interface PageProps {
  children: React.ReactNode
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
  }
  org?: {
    id: string
    name: string
    slug: string
  }
  userRole: string
  staffSubrole?: string
  title: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Page({ children, user, org, userRole, staffSubrole, title, breadcrumbs }: PageProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar user={user} org={org} userRole={userRole} staffSubrole={staffSubrole} />
      <div className="sm:pl-64">
        <Topbar title={title} breadcrumbs={breadcrumbs} user={user} userRole={userRole} />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {userRole === 'PARENT' && <OverduePaymentBanner />}
            {userRole !== 'PARENT' && userRole !== 'OWNER' && <PaymentRequiredBanner />}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
