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
  Shield,
  Edit,
  X,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { useStaffPermissions } from '@/lib/staff-permissions'

interface PaymentMethodSettings {
  stripeEnabled: boolean
  autoPaymentEnabled: boolean
  cashPaymentEnabled: boolean
  bankTransferEnabled: boolean
  acceptsCard: boolean
  acceptsCash: boolean
  acceptsBankTransfer: boolean
  billingDay: number
  stripeConnectAccountId: string | null
  hasStripeConnect: boolean
  paymentInstructions: string
  bankAccountName: string | null
  bankSortCode: string | null
  bankAccountNumber: string | null
  hasStripeConfigured: boolean
}

export function PaymentMethodsTab() {
  const { data: session } = useSession()
  const userSubrole = (session?.user as any)?.staffSubrole || 'ADMIN'
  const { hasPermission } = useStaffPermissions(session?.user, userSubrole as any)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentMethodSettings>({
    stripeEnabled: false,
    autoPaymentEnabled: true,
    cashPaymentEnabled: true,
    bankTransferEnabled: true,
    acceptsCard: false,
    acceptsCash: true,
    acceptsBankTransfer: true,
    billingDay: 1,
    stripeConnectAccountId: null,
    hasStripeConnect: false,
    paymentInstructions: '',
    bankAccountName: null,
    bankSortCode: null,
    bankAccountNumber: null,
    hasStripeConfigured: false
  })
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [stripeKeys, setStripeKeys] = useState({
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
  })
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false)
  const [tempBankDetails, setTempBankDetails] = useState({
    bankAccountName: null as string | null,
    bankSortCode: null as string | null,
    bankAccountNumber: null as string | null
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
        setTempBankDetails({
          bankAccountName: data.bankAccountName || null,
          bankSortCode: data.bankSortCode || null,
          bankAccountNumber: data.bankAccountNumber || null
        })
        setIsEditingBankDetails(false)
        setTempBankDetails({
          bankAccountName: data.bankAccountName || null,
          bankSortCode: data.bankSortCode || null,
          bankAccountNumber: data.bankAccountNumber || null
        })
      } else {
        throw new Error('Failed to fetch payment settings')
      }
    } catch (error) {
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!hasPermission('access_settings')) {
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
          stripeWebhookSecret: stripeKeys.webhookSecret,
          acceptsCard: settings.acceptsCard,
          acceptsCash: settings.acceptsCash,
          acceptsBankTransfer: settings.acceptsBankTransfer,
          billingDay: settings.billingDay,
          bankAccountName: settings.bankAccountName,
          bankSortCode: settings.bankSortCode,
          bankAccountNumber: settings.bankAccountNumber
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
      toast.error(error instanceof Error ? error.message : 'Failed to save payment settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (key: keyof PaymentMethodSettings, value: boolean | string) => {
    // Auto-capitalize first letter for name fields
    if (key === 'bankAccountName' && typeof value === 'string' && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleEditBankDetails = () => {
    setTempBankDetails({
      bankAccountName: settings.bankAccountName,
      bankSortCode: settings.bankSortCode,
      bankAccountNumber: settings.bankAccountNumber
    })
    setIsEditingBankDetails(true)
  }

  const handleCancelEditBankDetails = () => {
    setSettings(prev => ({
      ...prev,
      bankAccountName: tempBankDetails.bankAccountName,
      bankSortCode: tempBankDetails.bankSortCode,
      bankAccountNumber: tempBankDetails.bankAccountNumber
    }))
    setIsEditingBankDetails(false)
  }

  const handleSaveBankDetails = async () => {
    if (!hasPermission('access_settings')) {
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
          bankAccountName: settings.bankAccountName,
          bankSortCode: settings.bankSortCode,
          bankAccountNumber: settings.bankAccountNumber
        })
      })

      if (response.ok) {
        toast.success('Bank details saved successfully')
        setTempBankDetails({
          bankAccountName: settings.bankAccountName,
          bankSortCode: settings.bankSortCode,
          bankAccountNumber: settings.bankAccountNumber
        })
        setIsEditingBankDetails(false)
        await fetchPaymentSettings()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save bank details')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save bank details')
    } finally {
      setSaving(false)
    }
  }

  const handleStripeKeyChange = (key: string, value: string) => {
    setStripeKeys(prev => ({ ...prev, [key]: value }))
  }

  const handleConnectStripe = async () => {
    if (!hasPermission('access_settings')) {
      toast.error('You do not have permission to connect Stripe')
      return
    }

    setConnectingStripe(true)
    try {
      const response = await fetch('/api/settings/stripe-connect', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.onboardingUrl) {
          // Redirect to Stripe onboarding
          window.location.href = data.onboardingUrl
        } else {
          toast.success('Stripe account connected')
          await fetchPaymentSettings()
        }
      } else {
        const error = await response.json()
        const errorMessage = error.error || 'Failed to connect Stripe account'
        
        // If it's a Connect not enabled error, show helpful message
        if (errorMessage.includes('Connect is not enabled')) {
          toast.error(errorMessage, {
            duration: 10000,
            action: {
              label: 'Open Dashboard',
              onClick: () => window.open('https://dashboard.stripe.com/settings/connect', '_blank')
            }
          })
        } else {
          toast.error(errorMessage)
        }
        
        throw new Error(errorMessage)
      }
    } catch (error) {
      // Error already handled above
      if (!(error instanceof Error && error.message.includes('Connect is not enabled'))) {
        toast.error(error instanceof Error ? error.message : 'Failed to connect Stripe account')
      }
    } finally {
      setConnectingStripe(false)
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
          {/* Stripe Connect Setup */}
          {!settings.hasStripeConnect && (
            <div className="p-4 sm:p-6 border border-[var(--border)] rounded-lg bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="p-2 bg-gray-100 rounded-full mt-1 shrink-0">
                    <CreditCard className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base mb-2 sm:mb-1">Card Payments (Automatic)</h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-3 sm:mb-2 leading-relaxed">
                      Let parents pay fees automatically with their credit or debit card. No more chasing payments or manual reminders—fees are charged automatically each month.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 mb-3 sm:mb-0">
                      <span className="inline-flex items-center text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded border border-green-200 whitespace-nowrap">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span>Automatic monthly billing</span>
                      </span>
                      <span className="inline-flex items-center text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded border border-green-200 whitespace-nowrap">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span>Secure & PCI compliant</span>
                      </span>
                      <span className="inline-flex items-center text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded border border-green-200 whitespace-nowrap">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span>Get paid faster</span>
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed">
                      Powered by Stripe—the same secure payment system used by millions of businesses worldwide. Setup takes just 2 minutes.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe || !hasPermission('access_settings')}
                  variant="default"
                  className="shrink-0 w-full sm:w-auto"
                >
                  {connectingStripe ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Setup Card Payments
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Automatic Card Payments */}
          {settings.hasStripeConnect && (
            <div className="p-4 sm:p-5 border border-[var(--border)] rounded-lg">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-gray-100 rounded-full shrink-0">
                    <CreditCard className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">Card Payments (Automatic)</h3>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded whitespace-nowrap">Connected</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Switch
                    checked={settings.acceptsCard}
                    onCheckedChange={(checked) => handleSettingChange('acceptsCard', checked)}
                    disabled={!hasPermission('access_settings')}
                  />
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] ml-[52px]">
                Parents can set up automatic payments via credit/debit cards
              </p>
            </div>
          )}

          {/* Bank Transfer */}
          <div className="p-4 sm:p-5 border border-[var(--border)] rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="p-2 bg-gray-100 rounded-full shrink-0">
                  <Building2 className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium">Bank Transfer</h3>
              </div>
              <div className="shrink-0">
                <Switch
                  checked={settings.acceptsBankTransfer ?? settings.bankTransferEnabled}
                  onCheckedChange={(checked) => {
                    handleSettingChange('acceptsBankTransfer', checked)
                    handleSettingChange('bankTransferEnabled', checked)
                  }}
                  disabled={!hasPermission('access_settings')}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] ml-[52px]">
              Parents can transfer money directly to your bank account
            </p>
          </div>

          {/* Cash Payments */}
          <div className="p-4 sm:p-5 border border-[var(--border)] rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="p-2 bg-gray-100 rounded-full shrink-0">
                  <Coins className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
                </div>
                <h3 className="font-medium">Cash Payments</h3>
              </div>
              <div className="shrink-0">
                <Switch
                  checked={settings.acceptsCash ?? settings.cashPaymentEnabled}
                  onCheckedChange={(checked) => {
                    handleSettingChange('acceptsCash', checked)
                    handleSettingChange('cashPaymentEnabled', checked)
                  }}
                  disabled={!hasPermission('access_settings')}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] ml-[52px]">
              Parents can pay in cash at the school office
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Details */}
      {settings.bankTransferEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Bank Transfer Details</span>
                </CardTitle>
                <CardDescription>
                  Provide your bank account details for parents to make direct transfers. These will be shown to parents who choose bank transfer.
                </CardDescription>
              </div>
              {hasPermission('access_settings') && (
                <div className="flex items-center gap-2">
                  {!isEditingBankDetails ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditBankDetails}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditBankDetails}
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveBankDetails}
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bankAccountName">Account Name</Label>
              <Input
                id="bankAccountName"
                placeholder="e.g., Masjid Falah"
                value={settings.bankAccountName || ''}
                onChange={(e) => handleSettingChange('bankAccountName', e.target.value)}
                disabled={!isEditingBankDetails || !hasPermission('access_settings')}
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
                  disabled={!isEditingBankDetails || !hasPermission('access_settings')}
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
                  disabled={!isEditingBankDetails || !hasPermission('access_settings')}
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
                A standing order is an automatic payment that sends money from the parent's bank account to the school each month. 
                Parents can set this up through their online banking using the details above. Once set up, payments will be made automatically each month on the due date.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Billing Day</span>
          </CardTitle>
          <CardDescription>
            The day of the month when automatic card payments will be charged (1-28)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label htmlFor="billingDay">Billing Day</Label>
            <Input
              id="billingDay"
              type="number"
              min="1"
              max="28"
              value={settings.billingDay}
              onChange={(e) => handleSettingChange('billingDay', parseInt(e.target.value) || 1)}
              disabled={!hasPermission('access_settings')}
            />
          </div>
        </CardContent>
      </Card>

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
      {hasPermission('access_settings') && (
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

