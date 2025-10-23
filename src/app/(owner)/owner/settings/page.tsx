import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Save, Globe, CreditCard, Calendar, Building2, Shield } from 'lucide-react'

export default async function OwnerSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your Madrasah OS platform settings and preferences.
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        {/* Platform Settings */}
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
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  defaultValue="Madrasah OS"
                  placeholder="Enter platform name"
                />
              </div>
              <div>
                <Label htmlFor="default-timezone">Default Timezone</Label>
                <Select defaultValue="Europe/London">
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
                <Label htmlFor="max-orgs">Maximum Organizations</Label>
                <Input
                  id="max-orgs"
                  type="number"
                  defaultValue="100"
                  placeholder="Enter maximum organizations"
                />
              </div>
              <div>
                <Label htmlFor="trial-days">Trial Period (days)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  defaultValue="14"
                  placeholder="Enter trial period"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure platform security and access controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Email Verification</Label>
                <p className="text-sm text-gray-500">Force users to verify their email addresses</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Two-Factor Authentication</Label>
                <p className="text-sm text-gray-500">Require 2FA for all admin users</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Session Timeout (minutes)</Label>
                <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
              </div>
              <Input
                type="number"
                defaultValue="60"
                className="w-20"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Password Requirements</Label>
                <p className="text-sm text-gray-500">Minimum 8 characters, mixed case, numbers</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Platform Billing Settings */}
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
                Organizations are automatically charged £1 per active student on the 1st of every month.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base-price">Base Price per Student (Monthly)</Label>
                <Input
                  id="base-price"
                  type="number"
                  defaultValue="1"
                  placeholder="Enter price per student"
                />
                <p className="text-sm text-gray-500 mt-1">Amount charged per active student each month</p>
              </div>
              <div>
                <Label htmlFor="billing-day">Billing Day of Month</Label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st of the month</SelectItem>
                    <SelectItem value="15">15th of the month</SelectItem>
                    <SelectItem value="28">28th of the month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Automatic Billing</Label>
                  <p className="text-sm text-gray-500">Automatically charge organizations monthly</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send Billing Notifications</Label>
                  <p className="text-sm text-gray-500">Notify organizations before billing</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div>
              <Label htmlFor="grace-period">Grace Period (days)</Label>
              <Input
                id="grace-period"
                type="number"
                defaultValue="7"
                placeholder="Enter grace period"
              />
              <p className="text-sm text-gray-500 mt-1">Days to wait before suspending overdue accounts</p>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Current Billing Status:</p>
                <p>• Total Organizations: 0</p>
                <p>• Total Active Students: 0</p>
                <p>• Expected Monthly Revenue: £0</p>
                <p className="text-xs text-gray-500 mt-2">
                  Revenue is calculated based on active student count across all organizations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Configuration
            </CardTitle>
            <CardDescription>
              Configure Stripe payment processing settings. All payments are processed through Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Payment Processor</span>
              </div>
              <p className="text-sm text-green-700">
                All payments are processed exclusively through Stripe. No other payment processors are supported.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stripe-publishable-key">Stripe Publishable Key</Label>
                <Input
                  id="stripe-publishable-key"
                  placeholder="pk_test_..."
                  defaultValue=""
                />
              </div>
              <div>
                <Label htmlFor="stripe-secret-key">Stripe Secret Key</Label>
                <Input
                  id="stripe-secret-key"
                  type="password"
                  placeholder="sk_test_..."
                  defaultValue=""
                />
              </div>
            </div>

            <div>
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                placeholder="whsec_..."
                defaultValue=""
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Test Mode</Label>
                <p className="text-sm text-gray-500">Use Stripe test keys for development</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Stripe Status:</p>
                <p>• Payment Processor: Stripe (Only)</p>
                <p>• Test Mode: Enabled</p>
                <p>• Webhook Status: Active</p>
                <p className="text-xs text-gray-500 mt-2">
                  All payments are processed exclusively through Stripe. Ensure your Stripe keys are properly configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
