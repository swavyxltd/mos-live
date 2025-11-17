'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Shield, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  UserCheck
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TeacherFormData {
  name: string
  email: string
  phone: string
  username: string
  password: string
  isActive: boolean
  staffSubrole: 'ADMIN' | 'TEACHER' | 'FINANCE_OFFICER'
}

interface TeacherFormProps {
  initialData?: Partial<TeacherFormData>
  isEditing?: boolean
  onSubmit: (data: TeacherFormData) => Promise<void>
  onCancel: () => void
}

// Demo usernames for validation
const EXISTING_USERNAMES = ['omar.khan', 'aisha.patel', 'ahmed.hassan', 'fatima.ali']

export function TeacherForm({ initialData, isEditing = false, onSubmit, onCancel }: TeacherFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [usernameError, setUsernameError] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')
  const [isCheckingUsername, setIsCheckingUsername] = React.useState(false)
  
  const [formData, setFormData] = React.useState<TeacherFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    username: initialData?.username || '',
    password: initialData?.password || '',
    isActive: initialData?.isActive ?? true,
    staffSubrole: initialData?.staffSubrole || 'TEACHER'
  })

  const handleInputChange = (field: keyof TeacherFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear errors when user starts typing
    if (field === 'username') {
      setUsernameError('')
    }
    if (field === 'password') {
      setPasswordError('')
    }
  }

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    return ''
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username) return

    setIsCheckingUsername(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const isAvailable = !EXISTING_USERNAMES.includes(username.toLowerCase())
    
    if (!isAvailable) {
      setUsernameError('Username is already taken. Please choose a different one.')
    } else {
      setUsernameError('')
    }
    
    setIsCheckingUsername(false)
  }

  const handleUsernameChange = (value: string) => {
    handleInputChange('username', value)
    
    // Debounce username check
    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(value)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }

  const handlePasswordChange = (value: string) => {
    handleInputChange('password', value)
    
    const error = validatePassword(value)
    setPasswordError(error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For new staff, username is automatically set to email
    if (!isEditing) {
      formData.username = formData.email
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? 'Edit Staff' : 'Add New Staff'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Moulana Omar"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="e.g., omar@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="e.g., +44 7700 900123"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffSubrole">Account Type *</Label>
            <Select
              value={formData.staffSubrole}
              onValueChange={(value: 'ADMIN' | 'TEACHER' | 'FINANCE_OFFICER') => handleInputChange('staffSubrole', value)}
            >
              <SelectTrigger className="w-full h-11 sm:h-10">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent 
                position="popper" 
                className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] max-h-[300px] sm:max-h-[400px] z-[100]"
                sideOffset={4}
              >
                <SelectItem value="ADMIN" className="pl-8 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="h-4 w-4 flex-shrink-0 text-gray-600" />
                    <span className="text-sm">Admin - Full access to all features</span>
                  </div>
                </SelectItem>
                <SelectItem value="TEACHER" className="pl-8 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 flex-shrink-0 text-gray-600" />
                    <span className="text-sm">Teacher - Teaching and student management</span>
                  </div>
                </SelectItem>
                <SelectItem value="FINANCE_OFFICER" className="pl-8 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="h-4 w-4 flex-shrink-0 text-gray-600" />
                    <span className="text-sm">Finance Officer - Financial data and payments</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs sm:text-sm text-gray-600">
              Choose the appropriate access level for this staff member
            </p>
          </div>

          {!isEditing && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-medium">Account Setup</h3>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  The staff member will receive an onboarding email at <strong>{formData.email}</strong> to set up their password and complete their profile. 
                  The username will be automatically set to their email address.
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">
                Account Status
              </Label>
              <p className="text-sm text-gray-600">
                {formData.isActive ? 'Staff member can sign in and access their portal' : 'Staff account is disabled - cannot login'}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              className={formData.isActive ? 'bg-green-100' : 'bg-red-100'}
              circleClassName={formData.isActive ? 'bg-green-500' : 'bg-red-500'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={
            isSubmitting || 
            !formData.name || 
            !formData.email || 
            !formData.phone || 
            !formData.staffSubrole
          }
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update Staff' : 'Create Staff')}
        </Button>
      </div>
    </form>
  )
}
