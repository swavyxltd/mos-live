'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Coins, Building2, Info, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface PaymentSettings {
  cashPaymentEnabled: boolean
  bankTransferEnabled: boolean
  paymentInstructions: string
  bankAccountName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
}

export default function PaymentMethodsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<PaymentSettings>({
    cashPaymentEnabled: false,
    bankTransferEnabled: false,
    paymentInstructions: '',
    bankAccountName: null,
    bankSortCode: null,
    bankAccountNumber: null
  })

  useEffect(() => {
    fetchPaymentSettings()
  }, [])

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('/api/settings/payment-methods')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          cashPaymentEnabled: data.cashPaymentEnabled || false,
          bankTransferEnabled: data.bankTransferEnabled || false,
          paymentInstructions: data.paymentInstructions || '',
          bankAccountName: data.bankAccountName || null,
          bankSortCode: data.bankSortCode || null,
          bankAccountNumber: data.bankAccountNumber || null
        })
      }
    } catch (error) {
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Payment Methods</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          View available payment methods for your children's fees.
        </p>
      </div>

      {/* Available Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
            <span>Available Payment Methods</span>
          </CardTitle>
          <CardDescription>
            Choose how you would like to pay for your children's fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cash Payments */}
          {settings.cashPaymentEnabled && (
            <div className="p-4 border border-[var(--border)] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium">Cash Payments</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Pay in cash at the school office
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer */}
          {settings.bankTransferEnabled && (
            <div className="p-4 border border-[var(--border)] rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Building2 className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-medium">Bank Transfer</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Transfer money directly to the school's bank account
                  </p>
                </div>
              </div>
            </div>
          )}

          {!settings.cashPaymentEnabled && !settings.bankTransferEnabled && (
            <div className="text-center py-8">
              <p className="text-[var(--muted-foreground)]">
                No payment methods are currently available. Please contact the school office for payment options.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Transfer Details */}
      {settings.bankTransferEnabled && settings.bankAccountName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Bank Transfer Details</span>
            </CardTitle>
            <CardDescription>
              Use these details to make a bank transfer payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Account Name</p>
                <p className="text-sm font-medium text-[var(--foreground)]">{settings.bankAccountName}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Sort Code</p>
                <p className="text-sm font-medium text-[var(--foreground)]">{settings.bankSortCode}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Account Number</p>
                <p className="text-sm font-medium text-[var(--foreground)]">{settings.bankAccountNumber}</p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Setting up a Standing Order</span>
              </div>
              <p className="text-sm text-gray-700">
                You can set up a standing order with your bank using these details to automatically pay your monthly fees. 
                Contact your bank to set this up, and payments will be made automatically each month on the due date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Instructions */}
      {settings.paymentInstructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Payment Instructions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-[var(--foreground)] whitespace-pre-line">
                {settings.paymentInstructions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Security Notice</span>
          </div>
          <p className="text-sm text-gray-700">
            All payment information is handled securely. For bank transfers, always verify the account details with the school office before making a payment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
