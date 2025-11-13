'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OverduePaymentBanner } from '@/components/overdue-payment-banner'
import { PaymentRequiredBanner } from '@/components/payment-required-banner'
import { MaintenanceNotificationBanner } from '@/components/maintenance-notification-banner'

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
    <div className="min-h-screen bg-[var(--background)] w-full overflow-x-hidden">
      <Sidebar user={user} org={org} userRole={userRole} staffSubrole={staffSubrole} />
      <div className="sm:pl-64 w-full min-w-0">
        <Topbar title={title} breadcrumbs={breadcrumbs} user={user} userRole={userRole} />
        <main className="py-4 sm:py-6 w-full min-w-0">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full min-w-0 pt-4 md:pt-0">
            <MaintenanceNotificationBanner />
            {userRole === 'PARENT' && <OverduePaymentBanner />}
            {(userRole === 'ADMIN' || userRole === 'STAFF') && <PaymentRequiredBanner />}
            <div className="w-full min-w-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
