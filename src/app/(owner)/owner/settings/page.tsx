'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Save, Globe, CreditCard, Calendar, Building2, Shield, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { toast } from 'sonner'
import { Skeleton, CardSkeleton, StatCardSkeleton } from '@/components/loading/skeleton'

interface PlatformSettings {
  id: string
  defaultTimezone: string
  logoUrl: string | null
  faviconUrl: string | null
  resendApiKey: string | null
  emailFromAddress: string | null
  maintenanceMode: boolean
  maintenanceMessage: string | null
  scheduledMaintenanceAt: string | null
  basePricePerStudent: number
  billingDayOfMonth: number
  autoBillingEnabled: boolean
  stripePublishableKey: string | null
  stripeSecretKey: string | null
  stripeWebhookSecret: string | null
  stripeTestMode: boolean
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecial: boolean
  ownerCalendlyUrl: string | null
}

interface BillingStats {
  totalOrgs: number
  totalStudents: number
  expectedMonthlyRevenue: string
}

export default function OwnerSettingsPage() {
  const { toast: toastHook } = useToast()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('platform')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null)
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({})
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [loading2FA, setLoading2FA] = useState(false)

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings()
    fetchBillingStats()
    fetchOwner2FA()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/owner/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
      setFormData(data)
    } catch (error: any) {
      toastHook({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const fetchBillingStats = async () => {
    try {
      const response = await fetch('/api/owner/settings/billing-stats')
      if (!response.ok) throw new Error('Failed to fetch billing stats')
      const data = await response.json()
      setBillingStats(data)
    } catch (error: any) {
    }
  }

  const fetchOwner2FA = async () => {
    try {
      const response = await fetch('/api/settings/user')
      if (response.ok) {
        const user = await response.json()
        if (user && user.twoFactorEnabled !== undefined) {
          setTwoFactorEnabled(user.twoFactorEnabled !== false)
        }
      }
    } catch (error: any) {
      // Silently fail - 2FA status is optional
    }
  }

  const handle2FAToggle = async (checked: boolean) => {
    setLoading2FA(true)
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twoFactorEnabled: checked
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTwoFactorEnabled(checked)
        toast.success(checked ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
      } else {
        toast.error('Failed to update 2FA settings')
      }
    } catch (error) {
      toast.error('Failed to update 2FA settings')
    } finally {
      setLoading2FA(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/owner/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      const result = await response.json()
      setSettings(result.settings)
      setFormData(result.settings)
      
      toastHook({
        title: 'Success',
        description: 'Settings saved successfully',
      })

      // Refresh billing stats if billing settings changed
      if (activeTab === 'billing') {
        fetchBillingStats()
      }
    } catch (error: any) {
      toastHook({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof PlatformSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-[var(--border)]">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Settings Form Skeleton */}
        <CardSkeleton className="h-96" />
        <CardSkeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Platform Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your Madrasah OS platform settings and preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Platform Configuration
              </CardTitle>
              <CardDescription>
                Configure global platform settings and defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-timezone">Default Timezone</Label>
                  <Select 
                    value={formData.defaultTimezone || 'Europe/London'}
                    onValueChange={(value) => handleInputChange('defaultTimezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="calendly-url">Calendly URL</Label>
                <Input
                  id="calendly-url"
                  type="url"
                  value={formData.ownerCalendlyUrl || ''}
                  onChange={(e) => handleInputChange('ownerCalendlyUrl', e.target.value)}
                  placeholder="https://calendly.com/your-username"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your Calendly booking link. This will be used in lead emails for the "Book Demo" button.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>
                Temporarily disable platform access for maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-gray-500">Enable to block all user access</p>
                </div>
                <Switch
                  checked={formData.maintenanceMode || false}
                  onCheckedChange={(checked) => handleInputChange('maintenanceMode', checked)}
                />
              </div>

              <div>
                <Label htmlFor="scheduled-maintenance">Scheduled Maintenance Date & Time</Label>
                <Input
                  id="scheduled-maintenance"
                  type="datetime-local"
                  value={formData.scheduledMaintenanceAt ? new Date(formData.scheduledMaintenanceAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    handleInputChange('scheduledMaintenanceAt', value ? new Date(value).toISOString() : null)
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Schedule maintenance to notify users 24 hours before. Leave empty to disable scheduled notifications.
                </p>
              </div>

              {formData.maintenanceMode && (
                <div>
                  <Label htmlFor="maintenance-message">Maintenance Message</Label>
                  <Textarea
                    id="maintenance-message"
                    value={formData.maintenanceMessage || ''}
                    onChange={(e) => handleInputChange('maintenanceMessage', e.target.value)}
                    placeholder="Enter message to display during maintenance..."
                    rows={3}
                  />
                </div>
              )}

              <div className={formData.maintenanceMode ? "bg-blue-50 border border-blue-200 rounded-lg p-4" : "bg-green-50 border border-green-200 rounded-lg p-4"}>
                <div className="flex items-center gap-2">
                  {formData.maintenanceMode ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Maintenance Mode: Active</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Platform Status: Online</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure platform security and password requirements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="password-min-length">Minimum Password Length</Label>
                <Input
                  id="password-min-length"
                  type="number"
                  value={formData.passwordMinLength || 8}
                  onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Uppercase Letters</Label>
                    <p className="text-sm text-gray-500">Must contain at least one uppercase letter</p>
                  </div>
                  <Switch
                    checked={formData.passwordRequireUppercase ?? true}
                    onCheckedChange={(checked) => handleInputChange('passwordRequireUppercase', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Lowercase Letters</Label>
                    <p className="text-sm text-gray-500">Must contain at least one lowercase letter</p>
                  </div>
                  <Switch
                    checked={formData.passwordRequireLowercase ?? true}
                    onCheckedChange={(checked) => handleInputChange('passwordRequireLowercase', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Numbers</Label>
                    <p className="text-sm text-gray-500">Must contain at least one number</p>
                  </div>
                  <Switch
                    checked={formData.passwordRequireNumbers ?? true}
                    onCheckedChange={(checked) => handleInputChange('passwordRequireNumbers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Special Characters</Label>
                    <p className="text-sm text-gray-500">Must contain at least one special character</p>
                  </div>
                  <Switch
                    checked={formData.passwordRequireSpecial ?? false}
                    onCheckedChange={(checked) => handleInputChange('passwordRequireSpecial', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage two-factor authentication for your owner account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account. When enabled, you'll receive a verification code via email when signing in.
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handle2FAToggle}
                  disabled={loading2FA}
                />
              </div>
              {twoFactorEnabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">2FA is enabled for your account</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    You will be required to enter a verification code sent to your email when signing in.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Platform Billing Settings
              </CardTitle>
              <CardDescription>
                Configure how organizations are billed for platform usage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Billing Model</span>
                </div>
                <p className="text-sm text-green-700">
                  Organizations are automatically charged per active student each month on their anniversary date.
                </p>
              </div>
              
              <div>
                <Label htmlFor="base-price">Base Price per Student (Monthly in £)</Label>
                <Input
                  id="base-price"
                  type="number"
                  step="0.01"
                  value={formData.basePricePerStudent ? (formData.basePricePerStudent / 100).toFixed(2) : '1.00'}
                  onChange={(e) => handleInputChange('basePricePerStudent', Math.round(parseFloat(e.target.value) * 100))}
                  placeholder="1.00"
                />
                <p className="text-sm text-gray-500 mt-1">Amount charged per active student each month</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This price must match your Stripe Price configuration. 
                    When you change this, you'll also need to update the corresponding Price in Stripe Dashboard 
                    or create a new Price and update the <code className="text-sm bg-yellow-100 px-1 rounded">STRIPE_PRICE_ID</code> environment variable.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Billing Email Notifications:</strong> Organizations will automatically receive email notifications after each billing attempt - both when payment succeeds and when it fails.
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Grace Period:</strong> Organizations have a 14-day grace period after payment failure before their account is automatically suspended.
                </p>
              </div>

              {billingStats && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Current Billing Status:</p>
                    <p>• Total Organizations: {billingStats.totalOrgs}</p>
                    <p>• Total Active Students: {billingStats.totalStudents}</p>
                        <p>• Expected Monthly Revenue: {billingStats.expectedMonthlyRevenue}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Revenue is calculated based on active student count across all organizations.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
