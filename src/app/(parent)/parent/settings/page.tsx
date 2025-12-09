'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, User, Mail, Phone, MapPin, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { isValidPhone, isValidUKPostcode } from '@/lib/input-validation'

interface UserSettings {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postcode: string
  title: string
  giftAidStatus: string
}

export default function ParentSettingsPage() {
  const { data: session, update, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    title: '',
    giftAidStatus: ''
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Initialize with session data first
      if (session.user.name || session.user.email) {
        setUserSettings(prev => ({
          ...prev,
          name: session.user?.name || prev.name || '',
          email: session.user?.email || prev.email || ''
        }))
      }
      fetchUserSettings()
    }
  }, [status, session])

  const fetchUserSettings = async () => {
    try {
      setLoadingSettings(true)
      const response = await fetch('/api/settings/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      const isJson = contentType?.includes('application/json')
      
      if (!response.ok) {
        let errorMessage = 'Failed to load settings'
        let errorData: any = {}
        
        try {
          if (isJson) {
            errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
          } else {
            const text = await response.text()
            errorMessage = text || `Server error: ${response.status} ${response.statusText}`
            errorData = { raw: text }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          error: JSON.stringify(errorData, null, 2),
          url: response.url
        })
        
        toast.error(errorMessage)
        return
      }
      
      if (!isJson) {
        const text = await response.text()
        console.error('Non-JSON response received:', text)
        toast.error('Invalid response from server')
        return
      }
      
      const data = await response.json()
      console.log('User settings loaded:', data)
      setUserSettings({
        name: data.name || session?.user?.name || '',
        email: data.email || session?.user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postcode: data.postcode || '',
        title: data.title || 'none',
        giftAidStatus: data.giftAidStatus || 'none'
      })
    } catch (error: any) {
      console.error('Error fetching user settings:', error)
      const errorMessage = error?.message || 'Failed to load settings. Please try again.'
      toast.error(errorMessage)
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSave = async () => {
    // Validate required fields
    if (!userSettings.phone || userSettings.phone.trim() === '') {
      toast.error('Phone number is required')
      setLoading(false)
      return
    }
    
    // Validate phone format
    if (!isValidPhone(userSettings.phone)) {
      toast.error('Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
      setLoading(false)
      return
    }
    
    // Validate postcode if provided
    if (userSettings.postcode && userSettings.postcode.trim() !== '' && !isValidUKPostcode(userSettings.postcode)) {
      toast.error('Please enter a valid UK postcode (e.g., SW1A 1AA)')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userSettings.name || '',
          email: userSettings.email || '',
          phone: userSettings.phone || '',
          address: userSettings.address || '',
          city: userSettings.city || '',
          postcode: userSettings.postcode || '',
          title: userSettings.title || '',
          giftAidStatus: userSettings.giftAidStatus || null
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success('Settings saved successfully')
        
        // Update local state with the saved data
        if (data.user) {
          setUserSettings({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            address: data.user.address || '',
            city: data.user.city || '',
            postcode: data.user.postcode || '',
            title: data.user.title || '',
            giftAidStatus: data.user.giftAidStatus || ''
          })
        }
        
        // Force NextAuth to refresh the session
        await update()
        await new Promise(resolve => setTimeout(resolve, 300))
        router.refresh()
        await new Promise(resolve => setTimeout(resolve, 200))
        
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      } else {
        toast.error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage your account settings and preferences.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Select
                  value={userSettings.title || 'none'}
                  onValueChange={(value) => setUserSettings(prev => ({ ...prev, title: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select title">
                      {userSettings.title || 'None'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Miss">Miss</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={userSettings.name}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length > 0) {
                      setUserSettings(prev => ({ ...prev, name: value.charAt(0).toUpperCase() + value.slice(1) }))
                    } else {
                      setUserSettings(prev => ({ ...prev, name: value }))
                    }
                  }}
                  placeholder="Enter your full name"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  <Input
                    id="email"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => setUserSettings(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={userSettings.phone}
                    onChange={(e) => {
                      const value = e.target.value
                      setUserSettings(prev => ({ ...prev, phone: value }))
                      // Validate in real-time
                      if (value && value.trim() !== '') {
                        if (!isValidPhone(value)) {
                          setPhoneError('Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
                        } else {
                          setPhoneError('')
                        }
                      } else {
                        setPhoneError('')
                      }
                    }}
                    className={phoneError ? 'border-red-500' : userSettings.phone && isValidPhone(userSettings.phone) ? 'border-green-500' : ''}
                    placeholder="Enter your phone number (e.g., +44 7700 900123 or 07700 900123)"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                )}
                {userSettings.phone && !phoneError && isValidPhone(userSettings.phone) && (
                  <p className="text-xs text-green-600 mt-1">Valid UK phone number</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  <Input
                    id="address"
                    value={userSettings.address}
                    onChange={(e) => {
                      const value = e.target.value
                      // Capitalize first letter of each word for address
                      const capitalized = value.split(' ').map(word => {
                        if (word.length === 0) return word
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      }).join(' ')
                      setUserSettings(prev => ({ ...prev, address: capitalized }))
                    }}
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={userSettings.city}
                  onChange={(e) => {
                    const value = e.target.value
                    // Capitalize first letter of each word for city
                    const capitalized = value.split(' ').map(word => {
                      if (word.length === 0) return word
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    }).join(' ')
                    setUserSettings(prev => ({ ...prev, city: capitalized }))
                  }}
                  placeholder="Enter your city"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={userSettings.postcode}
                  onChange={(e) => {
                    // Postcode should be full caps
                    const value = e.target.value.toUpperCase()
                    setUserSettings(prev => ({ ...prev, postcode: value }))
                    // Validate in real-time
                    if (value && value.trim() !== '') {
                      if (!isValidUKPostcode(value)) {
                        setPostcodeError('Please enter a valid UK postcode (e.g., SW1A 1AA)')
                      } else {
                        setPostcodeError('')
                      }
                    } else {
                      setPostcodeError('')
                    }
                  }}
                  className={postcodeError ? 'border-red-500' : userSettings.postcode && isValidUKPostcode(userSettings.postcode) ? 'border-green-500' : ''}
                  placeholder="Enter your postcode (e.g., SW1A 1AA)"
                />
                {postcodeError && (
                  <p className="text-xs text-red-600 mt-1">{postcodeError}</p>
                )}
                {userSettings.postcode && !postcodeError && isValidUKPostcode(userSettings.postcode) && (
                  <p className="text-xs text-green-600 mt-1">Valid UK postcode</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Gift Aid
          </CardTitle>
          <CardDescription>
            Declare your Gift Aid status for tax purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="giftAidStatus">Gift Aid Status</Label>
            <Select
              value={userSettings.giftAidStatus || 'none'}
              onValueChange={(value) => setUserSettings(prev => ({ ...prev, giftAidStatus: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Gift Aid status">
                  {userSettings.giftAidStatus === 'YES' ? 'Yes, I am eligible for Gift Aid' :
                   userSettings.giftAidStatus === 'NO' ? 'No, I am not eligible for Gift Aid' :
                   userSettings.giftAidStatus === 'NOT_SURE' ? 'Not Sure' :
                   'Not Declared'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not Declared</SelectItem>
                <SelectItem value="YES">Yes, I am eligible for Gift Aid</SelectItem>
                <SelectItem value="NO">No, I am not eligible for Gift Aid</SelectItem>
                <SelectItem value="NOT_SURE">Not Sure</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Gift Aid allows the madrasah to claim an extra 25% from the government on your fees at no extra cost to you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

