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
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false)
  const [savingBillingDay, setSavingBillingDay] = useState(false)
  const [savingPaymentInstructions, setSavingPaymentInstructions] = useState(false)
  const [settings, setSettings] = useState<PaymentMethodSettings>({
    stripeEnabled: false,
    autoPaymentEnabled: true,
    cashPaymentEnabled: false,
    bankTransferEnabled: false,
    acceptsCard: false,
    acceptsCash: false,
    acceptsBankTransfer: false,
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
      const response = await fetch('/api/settings/payment-methods', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        
        // Read actual boolean values from database - use accepts* as primary, fallback to *Enabled
        const cashEnabled = data.acceptsCash === true || data.cashPaymentEnabled === true
        const bankEnabled = data.acceptsBankTransfer === true || data.bankTransferEnabled === true
        const cardEnabled = data.acceptsCard === true
        
        setSettings({
          ...data,
          acceptsCard: cardEnabled,
          acceptsCash: cashEnabled,
          acceptsBankTransfer: bankEnabled,
          cashPaymentEnabled: cashEnabled,
          bankTransferEnabled: bankEnabled,
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

  const handleSavePaymentMethods = async () => {
    if (!hasPermission('access_settings')) {
      toast.error('You do not have permission to manage payment settings')
      return
    }

    // Get current state values - ensure they're proper booleans
    const cashValue = settings.cashPaymentEnabled === true || settings.acceptsCash === true
    const bankValue = settings.bankTransferEnabled === true || settings.acceptsBankTransfer === true
    const cardValue = settings.acceptsCard === true

    // Validate: If bank transfer is enabled, bank details must be provided
    if (bankValue) {
      if (!settings.bankAccountName || !settings.bankAccountName.trim()) {
        toast.error('Account Name is required when Bank Transfer is enabled')
        setIsEditingBankDetails(true)
        return
      }
      if (!settings.bankSortCode || !settings.bankSortCode.trim()) {
        toast.error('Sort Code is required when Bank Transfer is enabled')
        setIsEditingBankDetails(true)
        return
      }
      if (!settings.bankAccountNumber || !settings.bankAccountNumber.trim()) {
        toast.error('Account Number is required when Bank Transfer is enabled')
        setIsEditingBankDetails(true)
        return
      }
    }

    setSavingPaymentMethods(true)
    try {
      const response = await fetch('/api/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptsCard: cardValue,
          acceptsCash: cashValue,
          acceptsBankTransfer: bankValue,
          cashPaymentEnabled: cashValue,
          bankTransferEnabled: bankValue,
          // Include bank details if bank transfer is enabled
          ...(bankValue && {
            bankAccountName: settings.bankAccountName?.trim() || null,
            bankSortCode: settings.bankSortCode?.trim() || null,
            bankAccountNumber: settings.bankAccountNumber?.trim() || null
          })
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.settings) {
          // Update state immediately from response
          const savedCash = result.settings.acceptsCash === true || result.settings.cashPaymentEnabled === true
          const savedBank = result.settings.acceptsBankTransfer === true || result.settings.bankTransferEnabled === true
          const savedCard = result.settings.acceptsCard === true
          
          setSettings(prev => ({
            ...prev,
            acceptsCard: savedCard,
            acceptsCash: savedCash,
            acceptsBankTransfer: savedBank,
            cashPaymentEnabled: savedCash,
            bankTransferEnabled: savedBank,
            bankAccountName: result.settings.bankAccountName || prev.bankAccountName,
            bankSortCode: result.settings.bankSortCode || prev.bankSortCode,
            bankAccountNumber: result.settings.bankAccountNumber || prev.bankAccountNumber
          }))
        }
        
        toast.success('Payment methods saved successfully')
        setIsEditingBankDetails(false)
        
        // Re-fetch to ensure complete sync
        await fetchPaymentSettings()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save payment methods')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save payment methods')
    } finally {
      setSavingPaymentMethods(false)
    }
  }

  const handleSaveBillingDay = async () => {
    if (!hasPermission('access_settings')) {
      toast.error('You do not have permission to manage payment settings')
      return
    }

    setSavingBillingDay(true)
    try {
      const response = await fetch('/api/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingDay: settings.billingDay
        })
      })

      if (response.ok) {
        toast.success('Billing day saved successfully')
        await fetchPaymentSettings()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save billing day')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save billing day')
    } finally {
      setSavingBillingDay(false)
    }
  }

  const handleSavePaymentInstructions = async () => {
    if (!hasPermission('access_settings')) {
      toast.error('You do not have permission to manage payment settings')
      return
    }

    setSavingPaymentInstructions(true)
    try {
      const response = await fetch('/api/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentInstructions: settings.paymentInstructions
        })
      })

      if (response.ok) {
        toast.success('Payment instructions saved successfully')
        await fetchPaymentSettings()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save payment instructions')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save payment instructions')
    } finally {
      setSavingPaymentInstructions(false)
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

  // Auto-enable edit mode when bank transfer is enabled but details are missing
  useEffect(() => {
    const canEdit = hasPermission('access_settings')
    const bankEnabled = settings.bankTransferEnabled === true || settings.acceptsBankTransfer === true
    if (bankEnabled && !isEditingBankDetails && canEdit) {
      const hasAllDetails = settings.bankAccountName?.trim() && 
                           settings.bankSortCode?.trim() && 
                           settings.bankAccountNumber?.trim()
      if (!hasAllDetails) {
        setIsEditingBankDetails(true)
      }
    }
  }, [settings.bankTransferEnabled, settings.acceptsBankTransfer, settings.bankAccountName, settings.bankSortCode, settings.bankAccountNumber, isEditingBankDetails])

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

    // Validate required fields
    if (!settings.bankAccountName || !settings.bankAccountName.trim()) {
      toast.error('Account Name is required')
      return
    }
    if (!settings.bankSortCode || !settings.bankSortCode.trim()) {
      toast.error('Sort Code is required')
      return
    }
    if (!settings.bankAccountNumber || !settings.bankAccountNumber.trim()) {
      toast.error('Account Number is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountName: settings.bankAccountName.trim(),
          bankSortCode: settings.bankSortCode.trim(),
          bankAccountNumber: settings.bankAccountNumber.trim()
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

  // Get current toggle values - prioritize cashPaymentEnabled/bankTransferEnabled
  const cashEnabled = settings.cashPaymentEnabled === true
  const bankEnabled = settings.bankTransferEnabled === true
  const cardEnabled = settings.acceptsCard === true

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
                    checked={cardEnabled}
                    onCheckedChange={(checked) => {
                      setSettings(prev => ({
                        ...prev,
                        acceptsCard: checked
                      }))
                    }}
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
                  checked={bankEnabled}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({
                      ...prev,
                      acceptsBankTransfer: checked,
                      bankTransferEnabled: checked
                    }))
                  }}
                  disabled={!hasPermission('access_settings')}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] ml-[52px] mb-4">
              Parents can transfer money directly to your bank account
            </p>

            {/* Bank Transfer Details - Show when enabled */}
            {bankEnabled && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Bank Account Details <span className="text-red-500">* Required</span>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Provide your bank account details for parents to make direct transfers
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bankAccountName" className="text-sm">
                      Account Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bankAccountName"
                      placeholder="e.g., Masjid Falah"
                      value={settings.bankAccountName || ''}
                      onChange={(e) => handleSettingChange('bankAccountName', e.target.value)}
                      disabled={!isEditingBankDetails || !hasPermission('access_settings')}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankSortCode" className="text-sm">
                        Sort Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="bankSortCode"
                        placeholder="e.g., 12-34-56"
                        value={settings.bankSortCode || ''}
                        onChange={(e) => handleSettingChange('bankSortCode', e.target.value)}
                        disabled={!isEditingBankDetails || !hasPermission('access_settings')}
                        className="mt-1"
                        maxLength={8}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccountNumber" className="text-sm">
                        Account Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="bankAccountNumber"
                        placeholder="e.g., 12345678"
                        value={settings.bankAccountNumber || ''}
                        onChange={(e) => handleSettingChange('bankAccountNumber', e.target.value)}
                        disabled={!isEditingBankDetails || !hasPermission('access_settings')}
                        className="mt-1"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  
                  {hasPermission('access_settings') && (
                    <div className="flex justify-end gap-2 pt-2">
                      {isEditingBankDetails ? (
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
                                Save Details
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditBankDetails}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-[var(--muted-foreground)] mt-3">
                    Parents can set up a standing order through their online banking using these details—once set up, payments will be made automatically each month on the {settings.billingDay}{settings.billingDay === 1 ? 'st' : settings.billingDay === 2 ? 'nd' : settings.billingDay === 3 ? 'rd' : 'th'} of each month.
                  </p>
                </div>
              </div>
            )}
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
                  checked={cashEnabled}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({
                      ...prev,
                      acceptsCash: checked,
                      cashPaymentEnabled: checked
                    }))
                  }}
                  disabled={!hasPermission('access_settings')}
                />
              </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] ml-[52px]">
              Parents can pay in cash at the school office
            </p>
          </div>

          {/* Save Button for Payment Methods */}
          {hasPermission('access_settings') && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSavePaymentMethods}
                disabled={savingPaymentMethods}
                size="sm"
                className="flex items-center gap-2"
              >
                {savingPaymentMethods ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Payment Methods
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


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
          <div className="space-y-4">
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
            {hasPermission('access_settings') && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBillingDay}
                  disabled={savingBillingDay}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {savingBillingDay ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Billing Day
                    </>
                  )}
                </Button>
              </div>
            )}
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
          <div className="space-y-4">
            <Textarea
              placeholder="Enter payment instructions for parents..."
              value={settings.paymentInstructions || ''}
              onChange={(e) => handleSettingChange('paymentInstructions', e.target.value)}
              disabled={!hasPermission('access_settings')}
              rows={4}
            />
            {hasPermission('access_settings') && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSavePaymentInstructions}
                  disabled={savingPaymentInstructions}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {savingPaymentInstructions ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Instructions
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
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
