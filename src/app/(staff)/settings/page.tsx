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
import { Save, Globe, User, CreditCard, Calendar, Loader2, Download, DollarSign, Users, CheckCircle, Eye, FileText, Banknote, AlertTriangle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { StripePaymentMethodModal } from '@/components/stripe-payment-method'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import GenerateReportModal from '@/components/generate-report-modal'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { StaffSubrole } from '@/types/staff-roles'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface OrganizationSettings {
  name: string
  timezone: string
  lateThreshold: number
  address: string
  addressLine1: string
  postcode: string
  city: string
  phone: string
  publicPhone: string
  email: string
  publicEmail: string
  officeHours: string
}

interface UserSettings {
  name: string
  email: string
  phone: string
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
  const { data: session, update, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [loadingOrgSettings, setLoadingOrgSettings] = useState(true)
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: '',
    timezone: 'Europe/London',
    lateThreshold: 15,
    address: '',
    addressLine1: '',
    postcode: '',
    city: '',
    phone: '',
    publicPhone: '',
    email: '',
    publicEmail: '',
    officeHours: ''
  })
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: ''
  })
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    autoPayEnabled: true,
    paymentMethodId: undefined,
    lastUpdated: undefined
  })
  const [platformBilling, setPlatformBilling] = useState<{
    hasPaymentMethod: boolean
    paymentMethodId: string | null
    paymentMethods: any[]
    subscriptionStatus: string | null
    trialEndDate: string | null
    billingAnniversaryDate: number | null
  } | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [loadingBilling, setLoadingBilling] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentSetupClientSecret, setPaymentSetupClientSecret] = useState<string | undefined>(undefined)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([])
  const [loadingBillingRecords, setLoadingBillingRecords] = useState(true)
  const [activeTab, setActiveTab] = useState('organization')

  useEffect(() => {
    if (session?.user) {
      setUserSettings({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: session.user.phone || ''
      })
    }
  }, [session])

  // Fetch all settings data
  useEffect(() => {
    fetchOrgSettings()
    fetchPlatformBilling()
    fetchStudentCount()
    fetchBillingRecords()
  }, [])

  const fetchPlatformBilling = async () => {
    try {
      const response = await fetch('/api/settings/platform-payment')
      if (response.ok) {
        const data = await response.json()
        setPlatformBilling(data)
        setPaymentSettings({
          autoPayEnabled: true,
          paymentMethodId: data.paymentMethodId || undefined,
          lastUpdated: data.trialEndDate || undefined
        })
      }
    } catch (error) {
      console.error('Error fetching platform billing:', error)
    } finally {
      setLoadingBilling(false)
    }
  }

  const fetchOrgSettings = async () => {
    try {
      setLoadingOrgSettings(true)
      const response = await fetch('/api/settings/organization')
      if (response.ok) {
        const data = await response.json()
        setOrgSettings({
          name: data.name || '',
          timezone: data.timezone || 'Europe/London',
          lateThreshold: data.lateThreshold || 15,
          address: data.address || '',
          addressLine1: data.addressLine1 || '',
          postcode: data.postcode || '',
          city: data.city || '',
          phone: data.phone || '',
          publicPhone: data.publicPhone || '',
          email: data.email || '',
          publicEmail: data.publicEmail || '',
          officeHours: data.officeHours || ''
        })
      }
    } catch (error) {
      console.error('Error fetching organization settings:', error)
    } finally {
      setLoadingOrgSettings(false)
    }
  }

  const fetchStudentCount = async () => {
    try {
      const response = await fetch('/api/students')
      if (response.ok) {
        const data = await response.json()
        const activeCount = data.filter((s: any) => !s.isArchived).length
        setStudentCount(activeCount)
      }
    } catch (error) {
      console.error('Error fetching student count:', error)
    }
  }

  const fetchBillingRecords = async () => {
    try {
      setLoadingBillingRecords(true)
      // Fetch platform billing records
      const billing = await fetch('/api/settings/platform-payment')
      if (billing.ok) {
        const billingData = await billing.json()
        
        // Create billing records from PlatformOrgBilling data
        const records: BillingRecord[] = []
        
        if (billingData.lastBilledAt && billingData.lastBilledStudentCount !== undefined) {
          const billedDate = new Date(billingData.lastBilledAt)
          const billedAmount = billingData.lastBilledStudentCount // £1 per student, so amount = student count
          const status = billingData.subscriptionStatus === 'active' || billingData.subscriptionStatus === 'trialing' ? 'paid' : 'pending'
          
          records.push({
            id: '1',
            date: billedDate.toISOString().split('T')[0],
            amount: billedAmount,
            status: status,
            description: `Monthly subscription - ${billingData.lastBilledStudentCount} student${billingData.lastBilledStudentCount !== 1 ? 's' : ''}`,
            invoiceId: billingData.subscriptionStatus || 'PLATFORM-' + billedDate.getTime()
          })
        }
        
        setBillingRecords(records)
      }
    } catch (error) {
      console.error('Error fetching billing records:', error)
    } finally {
      setLoadingBillingRecords(false)
    }
  }

  // Calculate next payment date based on billing anniversary
  const getNextPaymentDate = () => {
    if (!platformBilling?.billingAnniversaryDate) return null
    
    const today = new Date()
    const anniversaryDay = platformBilling.billingAnniversaryDate
    
    // Get next payment date (next occurrence of anniversary day)
    let nextPayment = new Date(today.getFullYear(), today.getMonth(), anniversaryDay)
    
    // If anniversary day has passed this month, move to next month
    if (nextPayment < today) {
      nextPayment = new Date(today.getFullYear(), today.getMonth() + 1, anniversaryDay)
    }
    
    return nextPayment
  }

  const handleOrgSettingsChange = (field: keyof OrganizationSettings, value: string | number) => {
    setOrgSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleUserSettingsChange = (field: keyof UserSettings, value: string) => {
    setUserSettings(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentSettingsChange = async (field: keyof PaymentSettings, value: boolean | string) => {
    // Auto-pay is always enabled for platform billing - users cannot disable it
    if (field === 'autoPayEnabled') {
      toast.info('Automatic monthly billing is mandatory and cannot be disabled')
      return
    }
    
    const updatedSettings = { ...paymentSettings, [field]: value }
    setPaymentSettings(updatedSettings)
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
    setLoading(true)
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userSettings.name || '',
          email: userSettings.email || '',
          phone: userSettings.phone || ''
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success('User settings saved successfully')
        
        // Update local state with the saved data
        if (data.user) {
          setUserSettings({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || ''
          })
        }
        
        // Force NextAuth to refresh the session by calling update()
        // This triggers the JWT callback which fetches fresh user data from database
        await update()
        
        // Give the session time to update - the JWT callback fetches from DB
        // We need to wait for the client-side session to refresh
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Force a hard reload to ensure all components get the fresh session
        // This is necessary because server components use getServerSession which
        // reads from the JWT token, and client components use useSession
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      } else {
        const errorMessage = data.error || 'Failed to save user settings'
        toast.error(errorMessage)
        console.error('Error saving user settings:', errorMessage, data)
      }
    } catch (error) {
      console.error('Error saving user settings:', error)
      toast.error('Failed to save user settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPasswordReset = async () => {
    setIsSendingReset(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userSettings.email || session?.user?.email
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Password reset email sent! Check your inbox.')
      } else {
        toast.error(data.error || 'Failed to send password reset email')
      }
    } catch (error) {
      toast.error('Failed to send password reset email')
    } finally {
      setIsSendingReset(false)
    }
  }


  const handleStripePaymentMethod = async () => {
    try {
      // Create setup intent for platform billing
      const response = await fetch('/api/settings/platform-payment', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setPaymentSetupClientSecret(data.clientSecret)
        setShowPaymentModal(true)
      } else {
        toast.error('Failed to create payment setup')
      }
    } catch (error) {
      console.error('Error creating setup intent:', error)
      toast.error('Failed to create payment setup')
    }
  }

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    // Wait a moment for webhook to process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Refresh billing data
    await fetchPlatformBilling()
    
    toast.success('Payment method added successfully!')
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isFinanceOfficer 
              ? "View organization settings and manage your subscription payments."
              : "Manage your organization settings and preferences."
            }
          </p>
        </div>
        {activeTab === 'organization' && (
          <Button onClick={handleSaveOrgSettings} disabled={loading || isFinanceOfficer}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        )}
        {activeTab === 'profile' && (
          <Button onClick={handleSaveUserSettings} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Profile
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-6">
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
            </div>

            {/* Address Fields */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div>
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={orgSettings.addressLine1}
                  onChange={(e) => handleOrgSettingsChange('addressLine1', e.target.value)}
                  placeholder="Enter first line of address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={orgSettings.postcode}
                    onChange={(e) => handleOrgSettingsChange('postcode', e.target.value.toUpperCase())}
                    placeholder="SW1A 1AA"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={orgSettings.city}
                    onChange={(e) => handleOrgSettingsChange('city', e.target.value)}
                    placeholder="London"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Full Address (Legacy)</Label>
                <Textarea
                  id="address"
                  value={orgSettings.address}
                  onChange={(e) => handleOrgSettingsChange('address', e.target.value)}
                  placeholder="Enter full address (optional, for backward compatibility)"
                  rows={2}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Contact Phone (Internal/OS) *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={orgSettings.phone}
                    onChange={(e) => handleOrgSettingsChange('phone', e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Madrasah OS to contact you</p>
                </div>
                <div>
                  <Label htmlFor="publicPhone">Public Phone (For Parents) *</Label>
                  <Input
                    id="publicPhone"
                    type="tel"
                    value={orgSettings.publicPhone}
                    onChange={(e) => handleOrgSettingsChange('publicPhone', e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                  <p className="text-xs text-gray-500 mt-1">Visible on application form</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Contact Email (Internal/OS) *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={orgSettings.email}
                    onChange={(e) => handleOrgSettingsChange('email', e.target.value)}
                    placeholder="admin@madrasah.org"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Madrasah OS to contact you</p>
                </div>
                <div>
                  <Label htmlFor="publicEmail">Public Email (For Parents) *</Label>
                  <Input
                    id="publicEmail"
                    type="email"
                    value={orgSettings.publicEmail}
                    onChange={(e) => handleOrgSettingsChange('publicEmail', e.target.value)}
                    placeholder="info@madrasah.org"
                  />
                  <p className="text-xs text-gray-500 mt-1">Visible on application form</p>
                </div>
              </div>
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
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
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
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    To change your password, click the button below to receive a reset link via email.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRequestPasswordReset}
                    disabled={isSendingReset || loading}
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          {/* Payment Details */}
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Set up automatic payments via Stripe. You'll be charged £1 per active student monthly on your billing anniversary date.
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
                    You will be automatically charged £1 per active student monthly on your billing anniversary date through Stripe.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-medium">Current Students</span>
                      <div className="text-lg font-bold text-blue-900">{loadingBilling ? '...' : studentCount}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-medium">Monthly Cost</span>
                      <div className="text-lg font-bold text-blue-900">£{loadingBilling ? '...' : studentCount.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Automatic Monthly Billing</h3>
                  <p className="text-sm text-gray-600">
                    Your organization will be automatically charged monthly based on the number of active students (£1 per student per month). 
                    This is mandatory and cannot be disabled.
                  </p>
                </div>
              </div>
            </div>

            {platformBilling?.hasPaymentMethod ? (
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
            ) : (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method Required</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      You need to add a payment method before you can add students or access other features.
                    </p>
                    <Button 
                      className="h-11 bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={handleStripePaymentMethod}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
                    <span className="text-sm font-medium text-gray-900">
                      {loadingBilling ? '...' : (getNextPaymentDate() ? getNextPaymentDate()!.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Amount</span>
                    <span className="text-sm font-medium text-gray-900">£{loadingBilling ? '...' : studentCount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-sm font-medium text-gray-900">{loadingBilling ? '...' : `${studentCount} active`}</span>
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
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-700">
                        Enabled (Mandatory)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Method</span>
                    <div className="flex items-center gap-2">
                      {platformBilling?.paymentMethods && platformBilling.paymentMethods.length > 0 ? (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900">
                            •••• {platformBilling.paymentMethods[0].card?.last4 || 'N/A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">Not set</span>
                      )}
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
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
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
                value={studentCount}
                description="Active enrollments"
                detail={loadingBilling ? 'Loading...' : `£${studentCount.toFixed(2)} per month`}
                icon={<Users className="h-4 w-4" />}
              />
              
              <StatCard
                title="Monthly Cost"
                value={`£${studentCount.toFixed(2)}`}
                description="£1 per student"
                detail={loadingBilling ? 'Loading...' : `${studentCount} active students`}
                icon={<div className="text-lg font-bold">£</div>}
              />
              
              <StatCard
                title="Next Payment"
                value={getNextPaymentDate() ? getNextPaymentDate()!.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                description={getNextPaymentDate() ? getNextPaymentDate()!.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No payment date set'}
                detail={loadingBilling ? 'Loading...' : 'Automatic billing'}
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
                  <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subscription payments found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {showPaymentModal && (
        <StripePaymentMethodModal
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          clientSecret={paymentSetupClientSecret}
          isPlatformBilling={true}
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
