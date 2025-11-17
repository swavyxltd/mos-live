'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Shield,
  Loader2,
  Settings,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface PaymentMethod {
  id: string
  type: string
  last4: string
  brand: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

interface PaymentSettings {
  autoPayEnabled: boolean
  defaultPaymentMethodId: string | null
  paymentMethods: PaymentMethod[]
}

export default function PaymentMethodsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings>({
    autoPayEnabled: false,
    defaultPaymentMethodId: null,
    paymentMethods: []
  })
  const [showAddCard, setShowAddCard] = useState(false)

  useEffect(() => {
    fetchPaymentSettings()
  }, [])

  const fetchPaymentSettings = async () => {
    try {
      const response = await fetch('/api/settings/payment')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          autoPayEnabled: data.autoPayEnabled || false,
          defaultPaymentMethodId: data.paymentMethodId || null,
          paymentMethods: data.paymentMethods || []
        })
      }
    } catch (error) {
      toast.error('Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoPayToggle = async (enabled: boolean) => {
    if (!settings.defaultPaymentMethodId && enabled) {
      toast.error('Please add a payment method before enabling auto-pay')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoPayEnabled: enabled,
          paymentMethodId: settings.defaultPaymentMethodId
        })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, autoPayEnabled: enabled }))
        toast.success(enabled ? 'Auto-pay enabled' : 'Auto-pay disabled')
      } else {
        throw new Error('Failed to update auto-pay settings')
      }
    } catch (error) {
      toast.error('Failed to update auto-pay settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (paymentMethodId: string) => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoPayEnabled: settings.autoPayEnabled,
          paymentMethodId: paymentMethodId
        })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, defaultPaymentMethodId: paymentMethodId }))
        toast.success('Default payment method updated')
      } else {
        throw new Error('Failed to update default payment method')
      }
    } catch (error) {
      toast.error('Failed to update default payment method')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId })
      })

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          paymentMethods: prev.paymentMethods.filter(pm => pm.id !== paymentMethodId),
          defaultPaymentMethodId: prev.defaultPaymentMethodId === paymentMethodId ? null : prev.defaultPaymentMethodId,
          autoPayEnabled: prev.defaultPaymentMethodId === paymentMethodId ? false : prev.autoPayEnabled
        }))
        toast.success('Payment method deleted')
      } else {
        throw new Error('Failed to delete payment method')
      }
    } catch (error) {
      toast.error('Failed to delete payment method')
    } finally {
      setSaving(false)
    }
  }

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳'
      case 'mastercard':
        return '💳'
      case 'amex':
        return '💳'
      default:
        return '💳'
    }
  }

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`
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
          Manage your payment methods and auto-pay settings.
        </p>
      </div>

      {/* Auto-Pay Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Auto-Pay Settings</span>
          </CardTitle>
          <CardDescription>
            Enable automatic payments for your children's fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Automatic Payments</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Automatically pay invoices on their due date
                </p>
                {!settings.defaultPaymentMethodId && (
                  <p className="text-sm text-amber-600 mt-1">
                    Add a payment method to enable auto-pay
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={settings.autoPayEnabled}
              onCheckedChange={handleAutoPayToggle}
              disabled={saving || !settings.defaultPaymentMethodId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Payment Methods</span>
          </CardTitle>
          <CardDescription>
            Add and manage your payment methods for easy payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.paymentMethods.length > 0 ? (
              settings.paymentMethods.map(method => (
                <div key={method.id} className="border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getCardIcon(method.brand)}</div>
                      <div>
                        <h4 className="font-medium">
                          {method.brand.toUpperCase()} •••• {method.last4}
                        </h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Expires {formatExpiry(method.expiryMonth, method.expiryYear)}
                        </p>
                        {method.isDefault && (
                          <Badge variant="default" className="mt-1">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!method.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                          disabled={saving}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)] mb-4">No payment methods added yet</p>
                <Button onClick={() => setShowAddCard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            )}

            {settings.paymentMethods.length > 0 && (
              <div className="pt-4 border-t border-[var(--border)]">
                <Button onClick={() => setShowAddCard(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Payment Method
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Security & Privacy</span>
          </div>
          <p className="text-sm text-blue-700">
            Your payment information is encrypted and stored securely. We never store your full card details on our servers.
            All payments are processed through Stripe, a PCI-compliant payment processor.
          </p>
        </CardContent>
      </Card>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Payment Method</CardTitle>
              <CardDescription>
                Add a new credit or debit card for payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">Demo Mode</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    In demo mode, you can simulate adding payment methods. In production, this would integrate with Stripe Elements for secure card collection.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => {
                      toast.success('Payment method added (demo)')
                      setShowAddCard(false)
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add Card (Demo)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddCard(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
