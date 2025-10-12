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
import { Save, Globe, User, CreditCard, Calendar, Loader2, Download, DollarSign, Users, CheckCircle, Eye, FileText, Banknote } from 'lucide-react'
import { toast } from 'sonner'
import { StripePaymentMethodModal } from '@/components/stripe-payment-method'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import GenerateReportModal from '@/components/generate-report-modal'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { StaffSubrole } from '@/types/staff-roles'

interface OrganizationSettings {
  name: string
  timezone: string
  lateThreshold: number
  address: string
  phone: string
  email: string
  officeHours: string
}

interface UserSettings {
  name: string
  email: string
  phone: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PaymentSettings {
  autoPayEnabled: boolean
  paymentMethodId?: string
  lastUpdated?: string
}

interface BillingRecord {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  description: string
  invoiceId: string
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'Al-Noor Islamic School',
    timezone: 'Europe/London',
    lateThreshold: 15,
    address: '123 Education Street, London, SW1A 1AA',
    phone: '+44 20 7123 4567',
    email: 'admin@alnoor-school.co.uk',
    officeHours: 'Monday - Friday: 9:00 AM - 5:00 PM\nSaturday: 10:00 AM - 2:00 PM\nSunday: Closed'
  })
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    autoPayEnabled: true,
    paymentMethodId: 'pm_demo_1234567890',
    lastUpdated: '2024-01-15T10:30:00Z'
  })
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Demo billing data - payments TO the madrasah
  const billingRecords: BillingRecord[] = [
    {
      id: '1',
      date: '2024-01-01',
      amount: 47.00,
      status: 'paid',
      description: 'Monthly subscription - January 2024 (47 students)',
      invoiceId: 'MAD-INV-001'
    },
    {
      id: '2',
      date: '2023-12-01',
      amount: 45.00,
      status: 'paid',
      description: 'Monthly subscription - December 2023 (45 students)',
      invoiceId: 'MAD-INV-002'
    },
    {
      id: '3',
      date: '2023-11-01',
      amount: 43.00,
      status: 'paid',
      description: 'Monthly subscription - November 2023 (43 students)',
      invoiceId: 'MAD-INV-003'
    },
    {
      id: '4',
      date: '2023-10-01',
      amount: 41.00,
      status: 'paid',
      description: 'Monthly subscription - October 2023 (41 students)',
      invoiceId: 'MAD-INV-004'
    },
    {
      id: '5',
      date: '2023-09-01',
      amount: 39.00,
      status: 'paid',
      description: 'Monthly subscription - September 2023 (39 students)',
      invoiceId: 'MAD-INV-005'
    }
  ]

  // Calculate summary statistics
  // const totalPaid = billingRecords.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)

  useEffect(() => {
    if (session?.user) {
      setUserSettings({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: session.user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [session])

  const handleOrgSettingsChange = (field: keyof OrganizationSettings, value: string | number) => {
    setOrgSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleUserSettingsChange = (field: keyof UserSettings, value: string) => {
    setUserSettings(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentSettingsChange = async (field: keyof PaymentSettings, value: boolean | string) => {
    const updatedSettings = { ...paymentSettings, [field]: value }
    setPaymentSettings(updatedSettings)
    
    // Auto-save when auto-pay is toggled
    if (field === 'autoPayEnabled') {
      try {
        const response = await fetch('/api/settings/payment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings)
        })
        
        if (response.ok) {
          toast.success(`Auto-pay ${value ? 'enabled' : 'disabled'} automatically`)
        } else {
          toast.error('Failed to save auto-pay setting')
        }
      } catch (error) {
        toast.error('Failed to save auto-pay setting')
      }
    }
  }

  const handleSaveOrgSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgSettings)
      })
      
      if (response.ok) {
        toast.success('Organization settings saved successfully')
      } else {
        throw new Error('Failed to save organization settings')
      }
    } catch (error) {
      toast.error('Failed to save organization settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUserSettings = async () => {
    if (userSettings.newPassword !== userSettings.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userSettings.name,
          email: userSettings.email,
          phone: userSettings.phone,
          currentPassword: userSettings.currentPassword,
          newPassword: userSettings.newPassword
        })
      })
      
      if (response.ok) {
        toast.success('User settings saved successfully')
        // Update session
        await update()
        // Clear password fields
        setUserSettings(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      } else {
        throw new Error('Failed to save user settings')
      }
    } catch (error) {
      toast.error('Failed to save user settings')
    } finally {
      setLoading(false)
    }
  }


  const handleStripePaymentMethod = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    // Update local state immediately
    setPaymentSettings(prev => ({
      ...prev,
      paymentMethodId,
      lastUpdated: new Date().toISOString()
    }))
    
    // Auto-save to backend
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentSettings,
          paymentMethodId,
          lastUpdated: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        toast.success('Payment method saved automatically!')
      } else {
        toast.error('Payment method added but failed to save settings')
      }
    } catch (error) {
      toast.error('Payment method added but failed to save settings')
    }
    
    setShowPaymentModal(false)
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Calendar className="h-3 w-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><CreditCard className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Handle CSV export generation with month/year filters for subscription payments
  const handleGenerateReport = async (month: number, year: number) => {
    try {
      // Calculate start and end dates for the selected month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const response = await fetch('/api/reports/subscription-payments-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startDate,
          endDate,
          month,
          year
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `subscription-payments-${year}-${String(month + 1).padStart(2, '0')}.csv`
        
        // Create download link for CSV
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        
        // Clean up
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error('Failed to generate subscription payments CSV:', errorData)
        toast.error(`Failed to generate subscription payments CSV: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating subscription payments CSV:', error)
      toast.error(`Error generating subscription payments CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Check if user is a Finance Officer
  const isFinanceOfficer = session.user.staffSubrole === 'FINANCE_OFFICER'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isFinanceOfficer 
              ? "View organization settings and manage your subscription payments."
              : "Manage your organization settings and preferences."
            }
          </p>
        </div>
        <Button onClick={handleSaveOrgSettings} disabled={loading || isFinanceOfficer}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Organization Settings */}
        <Card className={isFinanceOfficer ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Organization Settings
              {isFinanceOfficer && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Read Only
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isFinanceOfficer 
                ? "Organization settings are read-only for Finance Officers. Contact an Admin to make changes."
                : "Configure your madrasah's basic information and preferences."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgSettings.name}
                  onChange={(e) => handleOrgSettingsChange('name', e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={orgSettings.timezone} onValueChange={(value) => handleOrgSettingsChange('timezone', value)}>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                <Input
                  id="late-threshold"
                  type="number"
                  value={orgSettings.lateThreshold}
                  onChange={(e) => handleOrgSettingsChange('lateThreshold', parseInt(e.target.value) || 0)}
                  placeholder="Enter late threshold"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={orgSettings.phone}
                  onChange={(e) => handleOrgSettingsChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={orgSettings.address}
                onChange={(e) => handleOrgSettingsChange('address', e.target.value)}
                placeholder="Enter organization address"
              />
            </div>

            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={orgSettings.email}
                onChange={(e) => handleOrgSettingsChange('email', e.target.value)}
                placeholder="Enter contact email"
              />
            </div>

            <div>
              <Label htmlFor="officeHours">Office Hours</Label>
              <Textarea
                id="officeHours"
                value={orgSettings.officeHours}
                onChange={(e) => handleOrgSettingsChange('officeHours', e.target.value)}
                placeholder="Enter office hours (e.g., Monday - Friday: 9:00 AM - 5:00 PM)"
                rows={3}
              />
              <p className="text-sm text-gray-500 mt-1">
                Use line breaks to separate different days/times
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your personal profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-name">Full Name</Label>
                <Input
                  id="user-name"
                  value={userSettings.name}
                  onChange={(e) => handleUserSettingsChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="user-email">Email Address</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userSettings.email}
                  onChange={(e) => handleUserSettingsChange('email', e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-phone">Phone Number</Label>
                <Input
                  id="user-phone"
                  type="tel"
                  value={userSettings.phone}
                  onChange={(e) => handleUserSettingsChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={userSettings.currentPassword}
                  onChange={(e) => handleUserSettingsChange('currentPassword', e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={userSettings.newPassword}
                  onChange={(e) => handleUserSettingsChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={userSettings.confirmPassword}
                  onChange={(e) => handleUserSettingsChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveUserSettings} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Set up automatic payments via Stripe. You'll be charged £1 per student on the 1st of every month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Automatic Billing via Stripe</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    You will be automatically charged £1 per active student on the 1st of every month through Stripe.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-medium">Current Students</span>
                      <div className="text-lg font-bold text-blue-900">47</div>
                    </div>
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-medium">Monthly Cost</span>
                      <div className="text-lg font-bold text-blue-900">£47.00</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Automatic Payments</Label>
                <p className="text-sm text-gray-500">Automatically charge your Stripe payment method monthly</p>
              </div>
              <Switch 
                checked={paymentSettings.autoPayEnabled}
                onCheckedChange={(checked) => handlePaymentSettingsChange('autoPayEnabled', checked)}
              />
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method Setup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your payment method is set up and ready for automatic billing. You can update your payment details anytime.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11 bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400" 
                      onClick={handleStripePaymentMethod}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
              {/* Next Payment Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Next Payment</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Date</span>
                    <span className="text-sm font-medium text-gray-900">February 1, 2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Amount</span>
                    <span className="text-sm font-medium text-gray-900">£47.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-sm font-medium text-gray-900">47 active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Processor</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">Stripe</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Auto-pay</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${paymentSettings.autoPayEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`text-sm font-medium ${paymentSettings.autoPayEnabled ? 'text-green-700' : 'text-red-700'}`}>
                        {paymentSettings.autoPayEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Method</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">•••• 4242</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm font-medium text-gray-900">
                      {paymentSettings.lastUpdated ? new Date(paymentSettings.lastUpdated).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Secure Payment Processing</h4>
                  <p className="text-xs text-gray-600">
                    All payments are processed securely through Stripe. Your payment information is encrypted and never stored on our servers. You can update your payment method at any time.
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* App Subscription Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              App Subscription Management
            </CardTitle>
            <CardDescription>
              View and manage your Madrasah OS subscription payments and billing history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Summary Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              <StatCard
                title="Current Students"
                value={47}
                description="Active enrollments"
                detail="+5 new this month"
                icon={<Users className="h-4 w-4" />}
              />
              
              <StatCard
                title="Monthly Cost"
                value="£47.00"
                description="£1 per student"
                detail="Automatic billing"
                icon={<div className="text-lg font-bold">£</div>}
              />
              
              <StatCard
                title="Next Payment"
                value="Feb 1"
                description="Automatic billing"
                detail="Monthly subscription"
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>

            {/* Subscription History Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Subscription History</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={() => setIsReportModalOpen(true)}
                >
                  <FileText className="h-4 w-4" />
                  Export Subscription CSV
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="font-medium">£{record.amount.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{record.invoiceId}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {billingRecords.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subscription payments found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {showPaymentModal && (
        <StripePaymentMethodModal
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerateReport={handleGenerateReport}
      />
    </div>
  )
}
