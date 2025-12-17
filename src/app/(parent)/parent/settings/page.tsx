'use client'

import { useState, useEffect, useRef } from 'react'
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
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'

interface UserSettings {
  firstName: string
  lastName: string
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
  const [phoneError, setPhoneError] = useState('')
  const [postcodeError, setPostcodeError] = useState('')
  const [userSettings, setUserSettings] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    title: '',
    giftAidStatus: ''
  })
  const [originalUserSettings, setOriginalUserSettings] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    title: '',
    giftAidStatus: ''
  })

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (loadingSettings) return false
    
    return (
      userSettings.firstName.trim() !== originalUserSettings.firstName.trim() ||
      userSettings.lastName.trim() !== originalUserSettings.lastName.trim() ||
      userSettings.email.trim() !== originalUserSettings.email.trim() ||
      userSettings.phone.trim() !== originalUserSettings.phone.trim() ||
      (userSettings.address || '').trim() !== (originalUserSettings.address || '').trim() ||
      (userSettings.city || '').trim() !== (originalUserSettings.city || '').trim() ||
      (userSettings.postcode || '').trim() !== (originalUserSettings.postcode || '').trim() ||
      (userSettings.title || '') !== (originalUserSettings.title || '') ||
      (userSettings.giftAidStatus || '') !== (originalUserSettings.giftAidStatus || '')
    )
  }

  // Use the unsaved changes warning hook
  const { startSaving, finishSaving } = useUnsavedChangesWarning({
    hasUnsavedChanges,
    enabled: !loadingSettings
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Initialize with session data first - always try to populate name
      const fullName = (session.user?.name || '').trim()
      let firstName = ''
      let lastName = ''
      
      if (fullName) {
        const nameParts = fullName.split(/\s+/).filter(part => part.length > 0)
        if (nameParts.length === 1) {
          firstName = nameParts[0]
          lastName = ''
        } else if (nameParts.length > 1) {
          firstName = nameParts[0]
          lastName = nameParts.slice(1).join(' ')
        }
      }
      
      setUserSettings(prev => ({
        ...prev,
        firstName: firstName || prev.firstName, // Only update if we have a value
        lastName: lastName || prev.lastName, // Only update if we have a value
        email: session.user?.email || prev.email || ''
      }))
      
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
      // Split name into firstName and lastName - prioritize API data, fallback to session
      const fullName = (data.name || session?.user?.name || '').trim()
      let firstName = ''
      let lastName = ''
      
      if (fullName) {
        const nameParts = fullName.split(/\s+/).filter(part => part.length > 0)
        if (nameParts.length === 1) {
          // Only one name part - treat as first name
          firstName = nameParts[0]
          lastName = ''
        } else if (nameParts.length > 1) {
          // Multiple parts - first is firstName, rest is lastName
          firstName = nameParts[0]
          lastName = nameParts.slice(1).join(' ')
        }
      }
      
      const settings = {
        firstName: firstName,
        lastName: lastName,
        email: data.email || session?.user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postcode: data.postcode || '',
        title: data.title || 'none',
        giftAidStatus: data.giftAidStatus || 'none'
      }
      setUserSettings(settings)
      setOriginalUserSettings(settings)
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
    if (!userSettings.firstName || userSettings.firstName.trim() === '') {
      toast.error('First name is required')
      setLoading(false)
      return
    }
    
    if (!userSettings.lastName || userSettings.lastName.trim() === '') {
      toast.error('Last name is required')
      setLoading(false)
      return
    }
    
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
    startSaving()
    try {
      // Combine firstName and lastName into name for API
      const fullName = `${userSettings.firstName.trim()} ${userSettings.lastName.trim()}`.trim()
      
      const response = await fetch('/api/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
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
          // Split name into firstName and lastName
          const fullName = (data.user.name || '').trim()
          let firstName = ''
          let lastName = ''
          
          if (fullName) {
            const nameParts = fullName.split(/\s+/).filter(part => part.length > 0)
            if (nameParts.length === 1) {
              firstName = nameParts[0]
              lastName = ''
            } else if (nameParts.length > 1) {
              firstName = nameParts[0]
              lastName = nameParts.slice(1).join(' ')
            }
          }
          
          const updatedSettings = {
            firstName: firstName,
            lastName: lastName,
            email: data.user.email || '',
            phone: data.user.phone || '',
            address: data.user.address || '',
            city: data.user.city || '',
            postcode: data.user.postcode || '',
            title: data.user.title || '',
            giftAidStatus: data.user.giftAidStatus || ''
          }
          
          setUserSettings(updatedSettings)
          setOriginalUserSettings(updatedSettings)
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
      finishSaving()
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="firstName"
                    value={userSettings.firstName}
                    onChange={(e) => {
                      const value = e.target.value
                      setUserSettings(prev => ({ 
                        ...prev, 
                        firstName: value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value 
                      }))
                    }}
                    placeholder="First name"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="lastName"
                    value={userSettings.lastName}
                    onChange={(e) => {
                      const value = e.target.value
                      setUserSettings(prev => ({ 
                        ...prev, 
                        lastName: value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value 
                      }))
                    }}
                    placeholder="Last name"
                    className="pl-9"
                    required
                  />
                </div>
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
                    className={phoneError ? 'border-red-500' : userSettings.phone && isValidPhone(userSettings.phone) && (userSettings.phone !== originalUserSettings.phone || !originalUserSettings.phone) ? 'border-green-500' : ''}
                    placeholder="Enter your phone number (e.g., +44 7700 900123 or 07700 900123)"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                )}
                {userSettings.phone && !phoneError && isValidPhone(userSettings.phone) && 
                 (userSettings.phone !== originalUserSettings.phone || !originalUserSettings.phone) && (
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
                  className={postcodeError ? 'border-red-500' : userSettings.postcode && isValidUKPostcode(userSettings.postcode) && (userSettings.postcode !== originalUserSettings.postcode || !originalUserSettings.postcode) ? 'border-green-500' : ''}
                  placeholder="Enter your postcode (e.g., SW1A 1AA)"
                />
                {postcodeError && (
                  <p className="text-xs text-red-600 mt-1">{postcodeError}</p>
                )}
                {userSettings.postcode && !postcodeError && isValidUKPostcode(userSettings.postcode) && 
                 (userSettings.postcode !== originalUserSettings.postcode || !originalUserSettings.postcode) && (
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

