'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvoicesPageClient } from '@/components/invoices-page-client'
import { PaymentMethodsTab } from '@/components/payment-methods-tab'
import { ManualPaymentsTab } from '@/components/manual-payments-tab'
import PaymentRecordsPageClient from '@/components/payment-records-page-client'

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('invoices')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Payments</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manage invoices, payment methods, manual payments, and payment records.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="manual">Manual Payments</TabsTrigger>
          <TabsTrigger value="records">Payment Records</TabsTrigger>
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

        <TabsContent value="records" className="mt-6">
          <PaymentRecordsPageClient />
        </TabsContent>
      </Tabs>
    </div>
  )
}
