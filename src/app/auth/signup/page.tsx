'use client'

import { useSearchParams } from 'next/navigation'
import React, { useState, Suspense, useEffect } from 'react'
import Image from 'next/image'
import { Mail, Lock, User, MapPin, Phone, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    
    fetch(`/api/auth/invitation?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setOrgName(data.orgName || '')
          // Check if this is a new org setup (ADMIN role invitation)
          setIsNewOrgSetup(data.role === 'ADMIN' && !data.acceptedAt)
        }
      })
      .catch(err => {
        setError('Failed to load invitation')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    // Validate required org fields for new org setup
    if (isNewOrgSetup) {
      if (!formData.orgAddressLine1 || !formData.orgPostcode || !formData.orgCity || 
          !formData.orgPhone || !formData.orgPublicPhone || !formData.orgEmail || !formData.orgPublicEmail) {
        setError('Please fill in all required organization details')
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

      // Success - redirect to sign in
      router.push('/auth/signin?signup=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingInvitation) {
    return (
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <Image 
            src="/logo.png" 
            alt="Madrasah OS" 
            width={198}
            height={40}
            className="w-[198px] h-auto"
            priority
            fetchPriority="high"
          />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <p className="text-center text-neutral-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[600px]">
      {/* Logo above card */}
      <div className="mb-6 flex justify-center">
        <Image 
          src="/logo.png" 
          alt="Madrasah OS" 
          width={198}
          height={40}
          className="w-[198px] h-auto"
          priority
          fetchPriority="high"
        />
      </div>
      
      {/* White card with soft shadow */}
      <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            {orgName ? `Join ${orgName}` : 'Create Account'}
          </h1>
          <p className="text-sm text-neutral-600">
            {orgName 
              ? 'Complete your account setup to get started.'
              : 'Set up your organization and account.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Details */}
          <div className="space-y-4 pb-4 border-b border-neutral-200">
            <h2 className="text-lg font-medium text-neutral-900">Personal Details</h2>
            
            {/* Name */}
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Full Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Email"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Phone (optional)"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Org Details - Only show if setting up new org - REQUIRED */}
          {isNewOrgSetup && (
            <div className="space-y-4 pt-4 border-t border-neutral-200">
              <h2 className="text-lg font-medium text-neutral-900">Organization Details *</h2>
              <p className="text-sm text-neutral-600">All fields below are required for new organization setup</p>
              
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
                  required={isNewOrgSetup}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
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
                    required={isNewOrgSetup}
                    value={formData.orgPostcode}
                    onChange={(e) => setFormData({ ...formData, orgPostcode: e.target.value.toUpperCase() })}
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
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
                    required={isNewOrgSetup}
                    value={formData.orgCity}
                    onChange={(e) => setFormData({ ...formData, orgCity: e.target.value })}
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                    placeholder="London"
                    autoComplete="address-level2"
                  />
                </div>
              </div>

              {/* Contact Phone (Internal/OS) */}
              <div>
                <label htmlFor="orgPhone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Contact Phone (Internal) *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="orgPhone"
                    name="orgPhone"
                    type="tel"
                    required={isNewOrgSetup}
                    value={formData.orgPhone}
                    onChange={(e) => setFormData({ ...formData, orgPhone: e.target.value })}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="orgPublicPhone"
                    name="orgPublicPhone"
                    type="tel"
                    required={isNewOrgSetup}
                    value={formData.orgPublicPhone}
                    onChange={(e) => setFormData({ ...formData, orgPublicPhone: e.target.value })}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="orgEmail"
                    name="orgEmail"
                    type="email"
                    required={isNewOrgSetup}
                    value={formData.orgEmail}
                    onChange={(e) => setFormData({ ...formData, orgEmail: e.target.value })}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="orgPublicEmail"
                    name="orgPublicEmail"
                    type="email"
                    required={isNewOrgSetup}
                    value={formData.orgPublicEmail}
                    onChange={(e) => setFormData({ ...formData, orgPublicEmail: e.target.value })}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                    placeholder="info@madrasah.org"
                    autoComplete="email"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">This will be visible to parents on the application form</p>
              </div>

              {/* Website (Optional) */}
              <div>
                <label htmlFor="orgWebsite" className="block text-sm font-medium text-neutral-700 mb-1">
                  Website (Optional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    id="orgWebsite"
                    name="orgWebsite"
                    type="url"
                    value={formData.orgWebsite}
                    onChange={(e) => setFormData({ ...formData, orgWebsite: e.target.value })}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                    placeholder="https://www.madrasah.org"
                    autoComplete="url"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <Image 
            src="/logo.png" 
            alt="Madrasah OS" 
            width={198}
            height={40}
            className="w-[198px] h-auto"
            priority
          />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <p className="text-center text-neutral-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}

