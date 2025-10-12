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
  DollarSign, 
  TrendingUp, 
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
        setSettings(data)
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
            <DollarSign className="h-5 w-5" />
            <span>Available Payment Methods</span>
          </CardTitle>
          <CardDescription>
            Choose which payment methods parents can use to pay fees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automatic Card Payments */}
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Automatic Card Payments</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Parents can set up automatic payments via credit/debit cards
                </p>
                {settings.stripeEnabled && (
                  <div className="flex items-center space-x-1 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">Stripe configured</span>
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={settings.autoPaymentEnabled}
              onCheckedChange={(checked) => handleSettingChange('autoPaymentEnabled', checked)}
              disabled={!hasPermission('manage_payments')}
            />
          </div>

          {/* Cash Payments */}
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 text-green-600" />
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
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-600" />
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
        </CardContent>
      </Card>

      {/* Stripe Configuration */}
      {settings.autoPaymentEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Stripe Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure Stripe to enable automatic card payments for parents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!settings.hasStripeConfigured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Stripe Not Configured</span>
                </div>
                <p className="text-sm text-yellow-700">
                  To enable automatic card payments, you need to configure your Stripe account.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stripe-publishable-key">Stripe Publishable Key</Label>
                <Input
                  id="stripe-publishable-key"
                  placeholder="pk_test_..."
                  value={stripeKeys.publishableKey}
                  onChange={(e) => handleStripeKeyChange('publishableKey', e.target.value)}
                  disabled={!hasPermission('manage_payments')}
                />
              </div>
              <div>
                <Label htmlFor="stripe-secret-key">Stripe Secret Key</Label>
                <Input
                  id="stripe-secret-key"
                  type="password"
                  placeholder="sk_test_..."
                  value={stripeKeys.secretKey}
                  onChange={(e) => handleStripeKeyChange('secretKey', e.target.value)}
                  disabled={!hasPermission('manage_payments')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stripe-webhook-secret">Stripe Webhook Secret</Label>
              <Input
                id="stripe-webhook-secret"
                type="password"
                placeholder="whsec_..."
                value={stripeKeys.webhookSecret}
                onChange={(e) => handleStripeKeyChange('webhookSecret', e.target.value)}
                disabled={!hasPermission('manage_payments')}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.stripeEnabled}
                onCheckedChange={(checked) => handleSettingChange('stripeEnabled', checked)}
                disabled={!hasPermission('manage_payments')}
              />
              <Label>Enable Stripe Integration</Label>
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
            value={settings.paymentInstructions}
            onChange={(e) => handleSettingChange('paymentInstructions', e.target.value)}
            disabled={!hasPermission('manage_payments')}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Security Notice</span>
          </div>
          <p className="text-sm text-blue-700">
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
