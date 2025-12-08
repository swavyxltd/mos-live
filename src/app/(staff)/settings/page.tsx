'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Save, Globe, User, CreditCard, Calendar, Loader2, Download, DollarSign, Users, CheckCircle, Eye, FileText, Banknote, AlertTriangle, XCircle, Settings, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { StripePaymentMethodModal } from '@/components/stripe-payment-method'
import { StatCard } from '@/components/ui/stat-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import GenerateReportModal from '@/components/generate-report-modal'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { StaffSubrole } from '@/types/staff-roles'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PaymentMethodsTab } from '@/components/payment-methods-tab'

interface OrganisationSettings {
  name: string
  timezone: string
  lateThreshold: number
  feeDueDay: number
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
  twoFactorEnabled: boolean
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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingOrgSettings, setLoadingOrgSettings] = useState(true)
  const [orgSettings, setOrgSettings] = useState<OrganisationSettings>({
    name: '',
    timezone: 'Europe/London',
    lateThreshold: 15,
    feeDueDay: 1,
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
    phone: '',
    twoFactorEnabled: true
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
  const [activeTab, setActiveTab] = useState('organisation')

  useEffect(() => {
    fetchUserSettings()
  }, [session])

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/settings/user')
      if (response.ok) {
        const data = await response.json()
        setUserSettings({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          twoFactorEnabled: data.twoFactorEnabled !== false // Default to true
        })
      }
    } catch (error) {
    }
  }

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
    } finally {
      setLoadingBilling(false)
    }
  }

  const fetchOrgSettings = async () => {
    try {
      setLoadingOrgSettings(true)
      const response = await fetch('/api/settings/organisation')
      if (response.ok) {
        const data = await response.json()
        setOrgSettings({
          name: data.name || '',
          timezone: data.timezone || 'Europe/London',
          lateThreshold: data.lateThreshold || 15,
          feeDueDay: data.feeDueDay || 1,
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

  const handleOrgSettingsChange = (field: keyof OrganisationSettings, value: string | number) => {
    setOrgSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleUserSettingsChange = (field: keyof UserSettings, value: string | boolean) => {
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
      const response = await fetch('/api/settings/organisation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgSettings)
      })
      
      if (response.ok) {
        toast.success('Organisation settings saved successfully')
        // Trigger refresh of org name everywhere
        window.dispatchEvent(new CustomEvent('refresh-org-name'))
        // Also refresh owner dashboard if org name changed
        if (window.location.pathname.startsWith('/owner/')) {
          window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
        }
        // Reload page to update org name in sidebar and all components
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        throw new Error('Failed to save organisation settings')
      }
    } catch (error) {
      toast.error('Failed to save organisation settings')
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
          phone: userSettings.phone || '',
          twoFactorEnabled: userSettings.twoFactorEnabled
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
            phone: data.user.phone || '',
            twoFactorEnabled: data.user.twoFactorEnabled !== false
          })
        }
        
        // Force NextAuth to refresh the session by calling update()
        // This triggers the JWT callback with trigger='update' which fetches fresh user data from database
        // The update() function should return a promise that resolves when the session is updated
        await update()
        
        // Wait a moment for the JWT callback to complete and update the token
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Refresh server components (layouts, etc.) which use getServerSession
        // This ensures server components get the updated session from the JWT token
        router.refresh()
        
        // Wait a bit more for router.refresh() to complete
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Force a hard reload to ensure all components get the fresh session
        // This ensures both server components (getServerSession) and client components (useSession) are updated
        // The reload will cause getServerSession to read the updated JWT token
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      } else {
        const errorMessage = data.error || 'Failed to save user settings'
        toast.error(errorMessage)
      }
    } catch (error) {
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
        toast.error(`Failed to generate subscription payments CSV: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
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
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {isFinanceOfficer 
              ? "View organisation settings and manage your subscription payments."
              : "Manage your organisation settings and preferences."
            }
          </p>
        </div>
        {activeTab === 'organisation' && (
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
        {/* Mobile: Dropdown Select */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="organisation">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Organisation</span>
                </div>
              </SelectItem>
              <SelectItem value="profile">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
              </SelectItem>
              <SelectItem value="payment-methods">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Payment Methods</span>
                </div>
              </SelectItem>
              <SelectItem value="subscription">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span>Your Subscription</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-4">
          <TabsTrigger value="organisation" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Your Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organisation" className="space-y-6">
          {/* Organisation Settings */}
        <Card className={isFinanceOfficer ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Organisation Settings
              {isFinanceOfficer && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Read Only
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isFinanceOfficer 
                ? "Organisation settings are read-only for Finance Officers. Contact an Admin to make changes."
                : "Configure your madrasah's basic information and preferences."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-name">Organisation Name</Label>
                <Input
                  id="org-name"
                  value={orgSettings.name}
                  onChange={(e) => handleOrgSettingsChange('name', e.target.value)}
                  placeholder="Enter organisation name"
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
                <Label htmlFor="fee-due-day">Fee Due Day (Day of Month) *</Label>
                <Input
                  id="fee-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={orgSettings.feeDueDay}
                  onChange={(e) => handleOrgSettingsChange('feeDueDay', parseInt(e.target.value) || 1)}
                  placeholder="e.g., 1 (for 1st of each month)"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Day of the month when fees are due for all classes. Payments not received within 48 hours will be marked as late, and after 96 hours as overdue.</p>
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
                  <p className="text-sm text-gray-500 mt-1">For Madrasah OS to contact you</p>
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
                  <p className="text-sm text-gray-500 mt-1">Visible on application form</p>
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
                  <p className="text-sm text-gray-500 mt-1">For Madrasah OS to contact you</p>
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
                  <p className="text-sm text-gray-500 mt-1">Visible on application form</p>
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
              <div className="space-y-4">
                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Shield className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={userSettings.twoFactorEnabled}
                    onCheckedChange={async (checked) => {
                      handleUserSettingsChange('twoFactorEnabled', checked)
                      // Auto-save when toggled
                      setLoading(true)
                      try {
                        const response = await fetch('/api/settings/user', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...userSettings,
                            twoFactorEnabled: checked
                          })
                        })
                        
                        const data = await response.json()
                        
                        if (response.ok && data.success) {
                          toast.success(checked ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
                          if (data.user) {
                            setUserSettings({
                              name: data.user.name || '',
                              email: data.user.email || '',
                              phone: data.user.phone || '',
                              twoFactorEnabled: data.user.twoFactorEnabled !== false
                            })
                          }
                        } else {
                          // Revert on error
                          handleUserSettingsChange('twoFactorEnabled', !checked)
                          toast.error('Failed to update 2FA settings')
                        }
                      } catch (error) {
                        // Revert on error
                        handleUserSettingsChange('twoFactorEnabled', !checked)
                        toast.error('Failed to update 2FA settings')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  />
                </div>

                {/* Password */}
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
            </div>

          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          <PaymentMethodsTab />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          {/* Payment Method Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Automatic billing: £1 per active student monthly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {platformBilling?.hasPaymentMethod ? (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Payment Method</h3>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {platformBilling?.paymentMethods && platformBilling.paymentMethods.length > 0 ? (
                            <>•••• {platformBilling.paymentMethods[0].card?.last4 || 'N/A'}</>
                          ) : (
                            'Not set'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Active</span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="h-10 border-gray-300 hover:bg-gray-50 w-full md:w-auto" 
                        onClick={handleStripePaymentMethod}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">Payment Method Required</h3>
                        <p className="text-sm text-[var(--muted-foreground)]">Add a payment method to continue</p>
                      </div>
                    </div>
                    <Button 
                      className="h-10 bg-gray-900 hover:bg-gray-800 text-white w-full md:w-auto" 
                      onClick={handleStripePaymentMethod}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Your Subscription
              </CardTitle>
              <CardDescription>
                View and manage your Madrasah OS subscription payments and billing history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscription Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Next Payment</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Date</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {loadingBilling ? '...' : (getNextPaymentDate() ? getNextPaymentDate()!.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Amount</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">£{loadingBilling ? '...' : studentCount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Status</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Auto-pay</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-[var(--foreground)]">Enabled</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--muted-foreground)]">Students</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">{loadingBilling ? '...' : studentCount}</span>
                    </div>
                  </div>
                </div>
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
                  <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
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
