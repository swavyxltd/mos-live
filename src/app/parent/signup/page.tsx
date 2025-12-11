'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Mail, Lock, Key, AlertCircle, Loader2, CheckCircle, User } from 'lucide-react'
import { isValidEmail } from '@/lib/input-validation'
import { Onboarding01 } from '@/components/onboarding-01'

interface ClaimData {
  student: {
    id: string
    firstName: string
    lastName: string
    dob: string | null
    claimStatus: string
  }
  org: {
    id: string
    name: string
  }
  classes: Array<{
    id: string
    name: string
  }>
}

interface ApplicationData {
  application: {
    id: string
    guardianName: string
    guardianEmail: string
    children: Array<{
      firstName: string
      lastName: string
      dob: string | null
    }>
  }
  org: {
    id: string
    name: string
  }
  students: Array<{
    id: string
    firstName: string
    lastName: string
    claimCode: string | null
    classes: Array<{
      id: string
      name: string
    }>
  }>
}

function ParentSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const claimCode = searchParams.get('code')
  const applicationToken = searchParams.get('applicationToken')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [claimData, setClaimData] = useState<ClaimData | null>(null)
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    claimCode: ''
  })

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (applicationToken) {
      // Application token flow
      fetchApplicationData()
    } else if (claimCode) {
      // Claim code flow - pre-fill claim code
      setFormData(prev => ({ ...prev, claimCode }))
      setLoading(false)
    } else {
      // No token or code - show form for claim code entry
      setLoading(false)
    }
  }, [applicationToken, claimCode])

  const fetchApplicationData = async () => {
    try {
      const response = await fetch('/api/applications/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationToken })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid application link')
        setLoading(false)
        return
      }

      setApplicationData(data)
      // Pre-fill email from application
      setFormData(prev => ({ ...prev, email: data.application.guardianEmail }))
      setLoading(false)
    } catch (err) {
      setError('Failed to load application details')
      setLoading(false)
    }
  }

  const validateClaimCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      return false
    }

    try {
      const response = await fetch('/api/claims/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: code.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid claim code')
        return false
      }

      setClaimData(data)
      setError('')
      return true
    } catch (err) {
      setError('Failed to validate claim code')
      return false
    }
  }

  // Update completed steps
  useEffect(() => {
    const newCompleted = new Set<string>()
    
    if (applicationToken && applicationData) {
      newCompleted.add('verify')
    } else if (claimData) {
      newCompleted.add('verify')
    }
    
    if (formData.email && isValidEmail(formData.email) && 
        formData.password && formData.password.length >= 8 &&
        formData.password === formData.confirmPassword) {
      newCompleted.add('account')
    }
    
    setCompletedSteps(newCompleted)
  }, [applicationToken, applicationData, claimData, formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // Basic validation
    if (!formData.email || !isValidEmail(formData.email)) {
      setError('Please enter a valid email address')
      setSubmitting(false)
      return
    }

    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setSubmitting(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setSubmitting(false)
      return
    }

    try {
      if (applicationToken) {
        // Application token flow
        const response = await fetch('/api/applications/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationToken,
            email: formData.email.toLowerCase().trim(),
            password: formData.password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create account')
          setSubmitting(false)
          return
        }

        setSuccess(true)
      } else {
        // Claim code flow
        if (!formData.claimCode || formData.claimCode.trim().length === 0) {
          setError('Please enter a claim code')
          setSubmitting(false)
          return
        }

        if (!claimData) {
          // Validate claim code first
          const isValid = await validateClaimCode(formData.claimCode)
          if (!isValid) {
            setSubmitting(false)
            return
          }
        }

        const response = await fetch('/api/claims/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claimCode: formData.claimCode.trim(),
            email: formData.email.toLowerCase().trim(),
            password: formData.password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create account')
          setSubmitting(false)
          return
        }

        setSuccess(true)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-[60vw] flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !claimData && !applicationData && !claimCode && !applicationToken) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-[60vw] flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Error</h2>
            <p className="text-sm text-neutral-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-[60vw] flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Check Your Email</h2>
            <p className="text-sm text-neutral-600 mb-4">
              We've sent a verification email to <strong>{formData.email}</strong>. Please click the link in the email to verify your account and complete the setup.
            </p>
            <p className="text-xs text-neutral-500">
              Didn't receive the email? Check your spam folder or contact the madrasah for assistance.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Determine page title and description
  const pageTitle = applicationToken && applicationData
    ? `Create Your Parent Portal Account`
    : `Create Your Parent Portal Account`
  
  const pageSubtitle = applicationToken && applicationData
    ? `Your child's application has been accepted at ${applicationData.org.name}. Create your account to access the Parent Portal.`
    : claimData
    ? `You are claiming access to ${claimData.student.firstName} ${claimData.student.lastName} at ${claimData.org.name}.`
    : `Enter your claim code to create your Parent Portal account.`

  // Define onboarding steps
  const onboardingSteps = [
    ...(applicationToken ? [] : [{
      id: 'verify',
      title: applicationToken ? 'Verify application' : 'Enter claim code',
      description: applicationToken 
        ? 'Verify your application details.'
        : 'Enter the claim code provided by the madrasah.',
      completed: completedSteps.has('verify'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {applicationToken && applicationData ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
                Please verify that the following information is correct.
              </p>

              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-600">Madrasah</label>
                    <p className="text-sm font-medium text-neutral-900">
                      {applicationData.org.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600">Parent Name</label>
                    <p className="text-sm font-medium text-neutral-900">
                      {applicationData.application.guardianName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600">Children</label>
                    <div className="space-y-1">
                      {applicationData.application.children.map((child, idx) => (
                        <p key={idx} className="text-sm font-medium text-neutral-900">
                          {child.firstName} {child.lastName}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Application verified</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
                Enter the claim code you received from the madrasah. This code links your account to your child's record.
              </p>

              {error && !claimData && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="claimCode" className="block text-sm font-medium text-neutral-700 mb-1">
                  Claim Code *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    id="claimCode"
                    name="claimCode"
                    type="text"
                    required
                    value={formData.claimCode}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase().trim()
                      setFormData({ ...formData, claimCode: code })
                      setError('')
                      // Auto-validate when code is 10 characters
                      if (code.length >= 8) {
                        validateClaimCode(code)
                      }
                    }}
                    className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors font-mono"
                    placeholder="Enter claim code"
                    maxLength={12}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">Enter the code from your claim sheet</p>
              </div>

              {claimData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Claim code verified</span>
                  </div>
                  <div className="space-y-1 text-sm text-green-800">
                    <p><strong>Student:</strong> {claimData.student.firstName} {claimData.student.lastName}</p>
                    <p><strong>Madrasah:</strong> {claimData.org.name}</p>
                    {claimData.classes.length > 0 && (
                      <p><strong>Class:</strong> {claimData.classes.map(c => c.name).join(', ')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }]),
    {
      id: 'account',
      title: 'Create your account',
      description: 'Set up your email and password to access your parent portal.',
      completed: completedSteps.has('account'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {applicationToken && !applicationData && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              Please verify your application first.
            </div>
          )}

          {!applicationToken && !claimData && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
              Please enter and verify your claim code first.
            </div>
          )}

          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Create your parent account to access your child's information.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Your Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="your.email@example.com"
                disabled={!!applicationToken && !!applicationData}
              />
            </div>
            {applicationToken && applicationData && (
              <p className="mt-1 text-xs text-neutral-500">This email is from your application</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Must be at least 8 characters long</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full pl-9 pr-3 h-10 text-sm rounded-md border bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 transition-colors ${
                  formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword 
                    ? 'border-red-300 focus:border-red-400' 
                    : formData.confirmPassword && formData.password && formData.password === formData.confirmPassword
                    ? 'border-green-300 focus:border-green-400'
                    : 'border-neutral-200/70 focus:border-neutral-400'
                }`}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={submitting || (applicationToken && !applicationData) || (!applicationToken && !claimData)}
              className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      )
    }
  ]

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-[60vw] flex-col gap-6">
        {/* Logo/Branding */}
        <a href="/" className="flex items-center gap-2 self-center">
          <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
        </a>

        <div className="text-center mb-2">
          <h1 className="text-2xl font-semibold text-neutral-900">{pageTitle}</h1>
          <p className="text-sm text-neutral-600 mt-1">{pageSubtitle}</p>
        </div>

        <Onboarding01
          steps={onboardingSteps}
          title="Create your parent account"
        />

        <p className="text-xs text-center text-neutral-500">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-neutral-900 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ParentSignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-[60vw] flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </div>
    }>
      <ParentSignupForm />
    </Suspense>
  )
}
