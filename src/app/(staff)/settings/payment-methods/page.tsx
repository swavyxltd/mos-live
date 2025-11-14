'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  CreditCard, 
  Coins, 
  Building2, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { useStaffPermissions } from '@/lib/staff-permissions'

interface PaymentMethodSettings {
  stripeEnabled: boolean
  autoPaymentEnabled: boolean
  cashPaymentEnabled: boolean
  bankTransferEnabled: boolean
  paymentInstructions: string
  bankAccountName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
  hasStripeConfigured: boolean
}

export default function PaymentMethodsPage() {
  const { data: session } = useSession()
  const { hasPermission } = useStaffPermissions(session?.user, 'ADMIN') // Default to ADMIN for now
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentMethodSettings>({
    stripeEnabled: false,
    autoPaymentEnabled: true,
    cashPaymentEnabled: true,
    bankTransferEnabled: true,
    paymentInstructions: '',
    bankAccountName: null,
    bankSortCode: null,
    bankAccountNumber: null,
    hasStripeConfigured: false
  })
  const [stripeKeys, setStripeKeys] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
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
          ...data,
          paymentInstructions: data.paymentInstructions || '',
          bankAccountName: data.bankAccountName || null,
          bankSortCode: data.bankSortCode || null,
          bankAccountNumber: data.bankAccountNumber || null
        })
      } else {
        throw new Error('Failed to fetch payment settings')
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!hasPermission('manage_payments')) {
      toast.error('You do not have permission to manage payment settings')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          stripePublishableKey: stripeKeys.publishableKey,
          stripeSecretKey: stripeKeys.secretKey,
          stripeWebhookSecret: stripeKeys.webhookSecret
        })
      })

      if (response.ok) {
        toast.success('Payment settings saved successfully')
        await fetchPaymentSettings()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save payment settings')
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save payment settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (key: keyof PaymentMethodSettings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleStripeKeyChange = (key: string, value: string) => {
    setStripeKeys(prev => ({ ...prev, [key]: value }))
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
          Configure how parents can pay for their children's fees.
        </p>
      </div>

      {/* Payment Method Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
            <span>Available Payment Methods</span>
          </CardTitle>
          <CardDescription>
            Choose which payment methods parents can use to pay fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cash Payments */}
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-full">
                <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-medium">Cash Payments</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Parents can pay in cash at the school office
                </p>
              </div>
            </div>
            <Switch
              checked={settings.cashPaymentEnabled}
              onCheckedChange={(checked) => handleSettingChange('cashPaymentEnabled', checked)}
              disabled={!hasPermission('manage_payments')}
            />
          </div>

          {/* Bank Transfer */}
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-full">
                <Building2 className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-medium">Bank Transfer</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Parents can transfer money directly to your bank account
                </p>
              </div>
            </div>
            <Switch
              checked={settings.bankTransferEnabled}
              onCheckedChange={(checked) => handleSettingChange('bankTransferEnabled', checked)}
              disabled={!hasPermission('manage_payments')}
            />
          </div>

          {/* Automatic Card Payments */}
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg opacity-50 pointer-events-none">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-full">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-500">Automatic Card Payments</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Coming soon</span>
                </div>
                <p className="text-sm text-gray-400">
                  Parents can set up automatic payments via credit/debit cards
                </p>
              </div>
            </div>
            <Switch
              checked={false}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Details */}
      {settings.bankTransferEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Bank Transfer Details</span>
            </CardTitle>
            <CardDescription>
              Provide your bank account details for parents to make direct transfers. These will be shown to parents who choose bank transfer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bankAccountName">Account Name</Label>
              <Input
                id="bankAccountName"
                placeholder="e.g., Masjid Falah"
                value={settings.bankAccountName || ''}
                onChange={(e) => handleSettingChange('bankAccountName', e.target.value)}
                disabled={!hasPermission('manage_payments')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankSortCode">Sort Code</Label>
                <Input
                  id="bankSortCode"
                  placeholder="e.g., 12-34-56"
                  value={settings.bankSortCode || ''}
                  onChange={(e) => handleSettingChange('bankSortCode', e.target.value)}
                  disabled={!hasPermission('manage_payments')}
                  maxLength={8}
                />
              </div>
              <div>
                <Label htmlFor="bankAccountNumber">Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  placeholder="e.g., 12345678"
                  value={settings.bankAccountNumber || ''}
                  onChange={(e) => handleSettingChange('bankAccountNumber', e.target.value)}
                  disabled={!hasPermission('manage_payments')}
                  maxLength={10}
                />
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Standing Order Instructions</span>
              </div>
              <p className="text-sm text-gray-700">
                Parents can set up a standing order using these details to automate monthly fee payments. 
                They will see these instructions when they choose bank transfer as their payment method.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Payment Instructions</span>
          </CardTitle>
          <CardDescription>
            Provide instructions for parents on how to make payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter payment instructions for parents..."
            value={settings.paymentInstructions || ''}
            onChange={(e) => handleSettingChange('paymentInstructions', e.target.value)}
            disabled={!hasPermission('manage_payments')}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Security Notice</span>
          </div>
          <p className="text-sm text-gray-700">
            All payment data is encrypted and processed securely. Stripe keys are stored securely and never exposed to clients.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasPermission('manage_payments') && (
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
