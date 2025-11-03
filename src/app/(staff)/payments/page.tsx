'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvoicesPageClient } from '@/components/invoices-page-client'
import { PaymentMethodsTab } from '@/components/payment-methods-tab'
import { ManualPaymentsTab } from '@/components/manual-payments-tab'

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('invoices')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Payments</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage invoices, payment methods, and manual payments.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="manual">Manual Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <InvoicesPageClient />
        </TabsContent>

        <TabsContent value="payment-methods" className="mt-6">
          <PaymentMethodsTab />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <ManualPaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
