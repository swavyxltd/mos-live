'use client'

import { useSearchParams } from 'next/navigation'
import React, { useState, Suspense, useEffect } from 'react'
import Image from 'next/image'
import { Mail, Lock, User, MapPin, Phone, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Onboarding01 } from '@/components/onboarding-01'

function SignUpForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const token = searchParams.get('token')
  const [orgName, setOrgName] = useState('')
  const [isNewOrgSetup, setIsNewOrgSetup] = useState(false)
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true)
  
  // Fetch invitation details
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token')
      setIsLoadingInvitation(false)
      return
    }
    
    fetch(`/api/auth/invitation?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
      .then(async res => {
        const responseText = await res.text()
        let errorData: any = {}
        let data: any = null
        
        try {
          if (responseText && responseText.trim().length > 0) {
            data = JSON.parse(responseText)
          }
        } catch (parseError: any) {
          console.error('[Signup] Failed to parse response as JSON:', {
            parseError: parseError?.message,
            responseText: responseText.substring(0, 500),
            responseLength: responseText.length
          })
        }
        
        if (!res.ok) {
          errorData = data || {}
          const errorMessage = errorData.error || errorData.message || `HTTP ${res.status} ${res.statusText}`
          
          // Log detailed error information - use multiple console statements to ensure visibility
          console.error('[Signup] API error - Status:', res.status, res.statusText)
          console.error('[Signup] API error - Response text:', responseText.substring(0, 1000))
          console.error('[Signup] API error - Parsed data:', JSON.stringify(errorData, null, 2))
          console.error('[Signup] API error - Token prefix:', token.substring(0, 8))
          console.error('[Signup] API error - Error message:', errorMessage)
          
          throw new Error(errorMessage)
        }
        
        return data
      })
      .then(data => {
        if (data?.error) {
          setError(data.error)
        } else if (data) {
          setOrgName(data.orgName || '')
          // Check if this is a new org setup (ADMIN role invitation)
          setIsNewOrgSetup(data.role === 'ADMIN' && !data.acceptedAt)
        } else {
          setError('Invalid response from server')
        }
      })
      .catch(err => {
        // Log error details in separate statements for better visibility
        console.error('[Signup] Error fetching invitation - Type:', typeof err)
        console.error('[Signup] Error fetching invitation - Message:', err?.message)
        console.error('[Signup] Error fetching invitation - Name:', err?.name)
        console.error('[Signup] Error fetching invitation - Stack:', err?.stack)
        console.error('[Signup] Error fetching invitation - Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
        setError(err.message || 'Failed to fetch invitation')
      })
      .finally(() => {
        setIsLoadingInvitation(false)
      })
  }, [token])
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Org details (for new org setup)
    orgAddress: '',
    orgAddressLine1: '',
    orgPostcode: '',
    orgCity: '',
    orgPhone: '',
    orgPublicPhone: '',
    orgEmail: '',
    orgPublicEmail: '',
    orgWebsite: '',
    timezone: 'Europe/London'
  })
  
  // isNewOrgSetup is now set from the invitation API response
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Track completed steps
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  
  // Check if a step is completed
  const checkStepCompleted = (stepId: string): boolean => {
    switch (stepId) {
      case 'account':
        return !!(formData.name && formData.email && formData.password && formData.confirmPassword && formData.password === formData.confirmPassword)
      case 'org-address':
        return !!(formData.orgAddressLine1 && formData.orgPostcode && formData.orgCity)
      case 'org-contact':
        return !!(formData.orgPhone && formData.orgPublicPhone && formData.orgEmail && formData.orgPublicEmail)
      case 'org-website':
        return false // Optional step, never mark as complete (user can skip)
      case 'submit':
        return false // Submit step is never complete until submitted
      default:
        return false
    }
  }
  
  // Update completed steps when form data changes
  useEffect(() => {
    const newCompleted = new Set<string>()
    if (checkStepCompleted('account')) newCompleted.add('account')
    if (isNewOrgSetup) {
      if (checkStepCompleted('org-address')) newCompleted.add('org-address')
      if (checkStepCompleted('org-contact')) newCompleted.add('org-contact')
      // Website is optional, so we don't mark it as complete
    }
    // Submit step is never marked as complete
    setCompletedSteps(newCompleted)
  }, [formData, isNewOrgSetup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Password validation is handled by the API based on platform settings

    // Validate required org fields for new org setup
    if (isNewOrgSetup) {
      if (!formData.orgAddressLine1 || !formData.orgPostcode || !formData.orgCity || 
          !formData.orgPhone || !formData.orgPublicPhone || !formData.orgEmail || !formData.orgPublicEmail) {
        setError('Please fill in all required organisation details')
        setIsLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          ...formData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Success - for new org setup, redirect to onboarding; otherwise sign in
      if (isNewOrgSetup) {
        // Sign in automatically and redirect to onboarding
        router.push('/auth/signin?signup=success&onboarding=true')
      } else {
        router.push('/auth/signin?signup=success')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingInvitation) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={128}
              height={32}
              className="h-8 w-auto"
              priority
              fetchPriority="high"
            />
          </div>
          <div className="text-center text-gray-600">Loading invitation...</div>
        </div>
      </div>
    )
  }

  // Define onboarding steps - broken into separate form sections
  const baseSteps = [
    {
      id: 'account',
      title: 'Create your account',
      description: 'Set up your personal details and secure your account with a password.',
      completed: completedSteps.has('account'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Set up your personal details and secure your account with a password.
          </p>
          
          {/* Name */}
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Full Name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Email"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Phone (optional)"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-9 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-9 pr-9 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Confirm Password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ]

  // Add organisation steps only if it's a new org setup
  const orgSteps = isNewOrgSetup ? [
    {
      id: 'org-address',
      title: 'Organisation address',
      description: 'Add your organisation\'s physical address details.',
      completed: completedSteps.has('org-address'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Add your organisation's physical address details.
          </p>
          
          {/* Address Line 1 */}
          <div>
            <label htmlFor="orgAddressLine1" className="block text-sm font-medium text-neutral-700 mb-1">
              Address Line 1 *
            </label>
            <input
              id="orgAddressLine1"
              name="orgAddressLine1"
              type="text"
              value={formData.orgAddressLine1}
              onChange={(e) => setFormData({ ...formData, orgAddressLine1: e.target.value })}
              placeholder="First line of address..."
              required
              className="w-full px-3 py-2 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
            />
          </div>

          {/* Postcode and City */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="orgPostcode" className="block text-sm font-medium text-neutral-700 mb-1">
                Postcode *
              </label>
              <input
                id="orgPostcode"
                name="orgPostcode"
                type="text"
                required
                value={formData.orgPostcode}
                onChange={(e) => setFormData({ ...formData, orgPostcode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="SW1A 1AA"
                autoComplete="postal-code"
              />
            </div>
            <div>
              <label htmlFor="orgCity" className="block text-sm font-medium text-neutral-700 mb-1">
                City *
              </label>
              <input
                id="orgCity"
                name="orgCity"
                type="text"
                required
                value={formData.orgCity}
                onChange={(e) => setFormData({ ...formData, orgCity: e.target.value })}
                className="w-full px-3 py-2 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="London"
                autoComplete="address-level2"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'org-contact',
      title: 'Contact information',
      description: 'Add phone numbers and email addresses for your organisation.',
      completed: completedSteps.has('org-contact'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Add phone numbers and email addresses for your organisation.
          </p>
          
          {/* Contact Phone (Internal/OS) */}
          <div>
            <label htmlFor="orgPhone" className="block text-sm font-medium text-neutral-700 mb-1">
              Contact Phone (Internal) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="orgPhone"
                name="orgPhone"
                type="tel"
                required
                value={formData.orgPhone}
                onChange={(e) => setFormData({ ...formData, orgPhone: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="+44 20 1234 5678"
                autoComplete="tel"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">For Madrasah OS to contact you</p>
          </div>

          {/* Public Phone */}
          <div>
            <label htmlFor="orgPublicPhone" className="block text-sm font-medium text-neutral-700 mb-1">
              Public Phone (For Parents) *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="orgPublicPhone"
                name="orgPublicPhone"
                type="tel"
                required
                value={formData.orgPublicPhone}
                onChange={(e) => setFormData({ ...formData, orgPublicPhone: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="+44 20 1234 5678"
                autoComplete="tel"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">This will be visible to parents on the application form</p>
          </div>

          {/* Contact Email (Internal/OS) */}
          <div>
            <label htmlFor="orgEmail" className="block text-sm font-medium text-neutral-700 mb-1">
              Contact Email (Internal) *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="orgEmail"
                name="orgEmail"
                type="email"
                required
                value={formData.orgEmail}
                onChange={(e) => setFormData({ ...formData, orgEmail: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="admin@madrasah.org"
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">For Madrasah OS to contact you</p>
          </div>

          {/* Public Email */}
          <div>
            <label htmlFor="orgPublicEmail" className="block text-sm font-medium text-neutral-700 mb-1">
              Public Email (For Parents) *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="orgPublicEmail"
                name="orgPublicEmail"
                type="email"
                required
                value={formData.orgPublicEmail}
                onChange={(e) => setFormData({ ...formData, orgPublicEmail: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="info@madrasah.org"
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">This will be visible to parents on the application form</p>
          </div>
        </div>
      ),
    },
    {
      id: 'org-website',
      title: 'Website (optional)',
      description: 'Add your organisation\'s website if you have one.',
      completed: false, // Optional step, never mark as complete
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Add your organisation's website if you have one.
          </p>
          
          {/* Website (Optional) */}
          <div>
            <label htmlFor="orgWebsite" className="block text-sm font-medium text-neutral-700 mb-1">
              Website (Optional)
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="orgWebsite"
                name="orgWebsite"
                type="url"
                value={formData.orgWebsite}
                onChange={(e) => setFormData({ ...formData, orgWebsite: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="https://www.madrasah.org"
                autoComplete="url"
              />
            </div>
          </div>
        </div>
      ),
    },
  ] : []

  // Final submit step
  const submitStep = {
    id: 'submit',
    title: 'Review and submit',
    description: 'Review your information and create your account.',
    completed: false,
    customContent: (
      <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-muted-foreground sm:max-w-64 md:max-w-xs mb-4">
          Review your information and create your account.
        </p>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 text-sm bg-neutral-900 text-white font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    ),
  }

  const onboardingSteps = [...baseSteps, ...orgSteps, submitStep]

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-xl flex-col gap-6">
        {/* Logo/Branding */}
        <a href="/" className="flex items-center gap-2 self-center">
          <Image 
            src="/logo.png" 
            alt="Madrasah OS" 
            width={128}
            height={32}
            className="h-8 w-auto"
            priority
            fetchPriority="high"
          />
        </a>

        {/* Onboarding Checklist */}
        <Onboarding01 
          steps={onboardingSteps}
          title={orgName ? `Get started with ${orgName}` : 'Get started with Madrasah OS'}
        />
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={128}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}

