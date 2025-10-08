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
  CheckCircle
} from 'lucide-react'

interface TeacherFormData {
  name: string
  email: string
  phone: string
  username: string
  password: string
  isActive: boolean
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
    isActive: initialData?.isActive ?? true
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
    
    // Validate password
    const passwordValidationError = validatePassword(formData.password)
    if (passwordValidationError) {
      setPasswordError(passwordValidationError)
      return
    }

    // Check username availability one more time
    if (!isEditing) {
      const isAvailable = !EXISTING_USERNAMES.includes(formData.username.toLowerCase())
      if (!isAvailable) {
        setUsernameError('Username is already taken. Please choose a different one.')
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
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
            {isEditing ? 'Edit Teacher' : 'Add New Teacher'}
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
                placeholder="e.g., Omar Khan"
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

          {/* Login Credentials */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <h3 className="text-lg font-medium">Login Credentials</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="e.g., omar.khan"
                    className="pl-10"
                    required
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
                {usernameError && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {usernameError}
                  </div>
                )}
                {formData.username && !usernameError && !isCheckingUsername && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Username is available
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter secure password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Password Requirements */}
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Password requirements:</div>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-1 text-xs ${
                      formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {formData.password.length >= 8 ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${
                      /[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {/[A-Z]/.test(formData.password) ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${
                      /[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {/[0-9]/.test(formData.password) ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      One number
                    </div>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Strength:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-2 w-6 rounded ${
                                level <= passwordStrength
                                  ? passwordStrength <= 2
                                    ? 'bg-red-500'
                                    : passwordStrength <= 3
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">
                          {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Good' : 'Strong'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {passwordError && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isActive" className="text-base font-medium">
                Account Status
              </Label>
              <p className="text-sm text-gray-600">
                {formData.isActive ? 'Teacher can sign in and access their portal' : 'Teacher account is disabled'}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
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
            !formData.username || 
            !formData.password ||
            !!usernameError ||
            !!passwordError
          }
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Create Teacher')}
        </Button>
      </div>
    </form>
  )
}
