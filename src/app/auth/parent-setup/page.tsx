'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, User, Calendar, AlertCircle, CreditCard, Coins, TrendingUp, Loader2, Phone, MapPin } from 'lucide-react'
import { isValidPhone, isValidUKPostcode } from '@/lib/input-validation'
import { Onboarding01 } from '@/components/onboarding-01'

interface InvitationData {
  invitation: {
    id: string
    parentEmail: string
    expiresAt: string
  }
  student: {
    id: string
    firstName: string
    lastName: string
    dob: string | null
    allergies: string | null
    medicalNotes: string | null
  }
  class: {
    id: string
    name: string
    monthlyFee: number
  }
  parent: {
    name: string
    phone: string
  } | null
  org: {
    id: string
    name: string
  }
  paymentMethods: {
    cash: boolean
    bankTransfer: boolean
    card: boolean
    stripe: boolean
  }
  bankDetails: {
    accountName: string | null
    sortCode: string | null
    accountNumber: string | null
  }
}


function ParentSetupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [passwordRequirements, setPasswordRequirements] = useState<Array<{ text: string; required: boolean; met: (password: string) => boolean }>>([])
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [postcodeError, setPostcodeError] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    parentTitle: '',
    parentFirstName: '',
    parentLastName: '',
    parentPhone: '',
    backupPhone: '',
    studentFirstName: '',
    studentLastName: '',
    studentDob: '',
    studentAllergies: '',
    studentMedicalNotes: '',
    paymentMethod: '',
    parentAddress: '',
    parentPostcode: '',
    giftAidStatus: ''
  })

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitationData()
    fetchPasswordRequirements()
  }, [token])

  const fetchPasswordRequirements = async () => {
    fetch('/api/settings/password-requirements')
      .then(res => res.json())
      .then(data => {
        let reqs: Array<{ text: string; required: boolean; met: (password: string) => boolean }> = []
        
        if (data.requirements) {
          // Convert requirements to format with met function
          reqs = data.requirements.map((req: { text: string; required: boolean }) => {
            let met: (password: string) => boolean
            
            if (req.text.includes('characters')) {
              const minLength = parseInt(req.text.match(/\d+/)?.[0] || '8')
              met = (p: string) => p.length >= minLength
            } else if (req.text.includes('uppercase')) {
              met = (p: string) => /[A-Z]/.test(p)
            } else if (req.text.includes('lowercase')) {
              met = (p: string) => /[a-z]/.test(p)
            } else if (req.text.includes('number') || req.text.includes('digit')) {
              met = (p: string) => /\d/.test(p)
            } else if (req.text.includes('special') || req.text.includes('symbol')) {
              met = (p: string) => /[^A-Za-z0-9]/.test(p)
            } else {
              met = () => false
            }
            
            return { ...req, met }
          })
        }
        
        // Always ensure uppercase, number, and special character are required (hard requirement)
        const hasUppercase = reqs.some(r => r.text.toLowerCase().includes('uppercase'))
        const hasNumber = reqs.some(r => r.text.toLowerCase().includes('number') || r.text.toLowerCase().includes('digit'))
        const hasSpecial = reqs.some(r => r.text.toLowerCase().includes('special') || r.text.toLowerCase().includes('symbol'))
        
        if (!hasUppercase) {
          reqs.push({ text: 'One uppercase letter', required: true, met: (p: string) => /[A-Z]/.test(p) })
        }
        if (!hasNumber) {
          reqs.push({ text: 'One number', required: true, met: (p: string) => /\d/.test(p) })
        }
        if (!hasSpecial) {
          reqs.push({ text: 'One special character', required: true, met: (p: string) => /[^A-Za-z0-9]/.test(p) })
        }
        
        setPasswordRequirements(reqs)
      })
      .catch(() => {
        // Fallback to default requirements if fetch fails - always require uppercase, number, and special character
        setPasswordRequirements([
          { text: 'At least 8 characters', required: true, met: (p: string) => p.length >= 8 },
          { text: 'One uppercase letter', required: true, met: (p: string) => /[A-Z]/.test(p) },
          { text: 'One lowercase letter', required: true, met: (p: string) => /[a-z]/.test(p) },
          { text: 'One number', required: true, met: (p: string) => /\d/.test(p) },
          { text: 'One special character', required: true, met: (p: string) => /[^A-Za-z0-9]/.test(p) }
        ])
      })
  }

  const fetchInvitationData = async () => {
    try {
      const response = await fetch(`/api/auth/parent-invitation?token=${token}`)
      if (!response.ok) {
        const error = await response.json()
        setError(error.error || 'Failed to load invitation')
        setLoading(false)
        return
      }

      const data = await response.json()
      setInvitationData(data)
      // Pre-fill parent info if available
      const parentNameParts = data.parent?.name ? data.parent.name.split(' ') : []
      setFormData(prev => ({
        ...prev,
        parentFirstName: parentNameParts[0] || '',
        parentLastName: parentNameParts.slice(1).join(' ') || '',
        parentPhone: data.parent?.phone || '',
        // Pre-fill student info
        studentFirstName: data.student.firstName,
        studentLastName: data.student.lastName,
        studentDob: data.student.dob ? new Date(data.student.dob).toISOString().split('T')[0] : '',
        studentAllergies: data.student.allergies || '',
        studentMedicalNotes: data.student.medicalNotes || ''
      }))
      setLoading(false)
    } catch (err) {
      setError('Failed to load invitation details')
      setLoading(false)
    }
  }

  // Validate password in real-time (for form submission validation)
  useEffect(() => {
    if (formData.password && passwordRequirements.length > 0) {
      const errors: string[] = []
      passwordRequirements.forEach(req => {
        if (req.required && !req.met(formData.password)) {
          errors.push(req.text)
        }
      })
      setPasswordErrors(errors)
    } else {
      setPasswordErrors([])
    }
  }, [formData.password, passwordRequirements])

  // Validate phone in real-time
  useEffect(() => {
    if (formData.parentPhone && formData.parentPhone.trim() !== '') {
      if (!isValidPhone(formData.parentPhone)) {
        setPhoneError('Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
      } else {
        setPhoneError('')
      }
    } else {
      setPhoneError('')
    }
  }, [formData.parentPhone])

  // Validate postcode in real-time
  useEffect(() => {
    if (formData.parentPostcode && formData.parentPostcode.trim() !== '') {
      if (!isValidUKPostcode(formData.parentPostcode)) {
        setPostcodeError('Please enter a valid UK postcode (e.g., SW1A 1AA)')
      } else {
        setPostcodeError('')
      }
    } else {
      setPostcodeError('')
    }
  }, [formData.parentPostcode])

  // Check if password meets all requirements
  const isPasswordValid = (): boolean => {
    if (!formData.password || passwordRequirements.length === 0) return false
    return passwordRequirements.every(req => {
      if (req.required) {
        return req.met(formData.password)
      }
      return true
    })
  }

  // Check if a step is completed and valid
  const checkStepCompleted = (stepId: string): boolean => {
    switch (stepId) {
      case 'password':
        const hasPassword = !!formData.password && !!formData.confirmPassword
        const passwordsMatch = formData.password === formData.confirmPassword
        const passwordMeetsRequirements = isPasswordValid()
        return hasPassword && passwordsMatch && passwordMeetsRequirements
      case 'parent-details':
        return !!(formData.parentFirstName && formData.parentLastName && formData.parentPhone && isValidPhone(formData.parentPhone))
      case 'student-details':
        return !!(formData.studentFirstName && formData.studentLastName)
      case 'address':
        // Address and postcode are required
        return !!(formData.parentAddress && formData.parentAddress.trim() !== '' && formData.parentPostcode && formData.parentPostcode.trim() !== '' && isValidUKPostcode(formData.parentPostcode))
      case 'payment':
        return !!formData.paymentMethod
      case 'gift-aid':
        // If YES is selected, address and postcode are required
        if (formData.giftAidStatus === 'YES') {
          return !!(formData.giftAidStatus && formData.parentAddress && formData.parentAddress.trim() !== '' && formData.parentPostcode && formData.parentPostcode.trim() !== '' && isValidUKPostcode(formData.parentPostcode))
        }
        // For NO or NOT_SURE, just need the status selected
        return !!formData.giftAidStatus
      case 'submit':
        return false // Submit step is never complete until submitted
      default:
        return false
    }
  }

  // Update completed steps when form data changes
  useEffect(() => {
    const newCompleted = new Set<string>()
    if (checkStepCompleted('password')) newCompleted.add('password')
    if (checkStepCompleted('parent-details')) newCompleted.add('parent-details')
    if (checkStepCompleted('student-details')) newCompleted.add('student-details')
    if (checkStepCompleted('address')) newCompleted.add('address')
    if (checkStepCompleted('payment')) newCompleted.add('payment')
    if (checkStepCompleted('gift-aid')) newCompleted.add('gift-aid')
    setCompletedSteps(newCompleted)
  }, [formData, passwordRequirements, phoneError, postcodeError])

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value
    if (field === 'parentFirstName' || field === 'parentLastName' || field === 'studentFirstName' || field === 'studentLastName') {
      processedValue = value.charAt(0).toUpperCase() + value.slice(1)
    } else if (field === 'parentAddress') {
      processedValue = value.split(' ').map(word => {
        if (word.length === 0) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }).join(' ')
    } else if (field === 'parentPostcode') {
      processedValue = value.toUpperCase()
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Import validation functions
    const { isValidName, isValidDateOfBirth, isValidPhone, isValidAddressLine, isValidCity, isValidUKPostcode } = await import('@/lib/input-validation')
    
    // Validate parent first name
    if (!formData.parentFirstName || !formData.parentFirstName.trim()) {
      setError('Parent first name is required')
      setSubmitting(false)
      return
    }
    if (!isValidName(formData.parentFirstName)) {
      setError('Parent first name must be a valid name (2-50 characters, letters only)')
      setSubmitting(false)
      return
    }

    // Validate parent last name
    if (!formData.parentLastName || !formData.parentLastName.trim()) {
      setError('Parent last name is required')
      setSubmitting(false)
      return
    }
    if (!isValidName(formData.parentLastName)) {
      setError('Parent last name must be a valid name (2-50 characters, letters only)')
      setSubmitting(false)
      return
    }

    // Validate student first name
    if (!formData.studentFirstName || !formData.studentFirstName.trim()) {
      setError('Student first name is required')
      setSubmitting(false)
      return
    }
    if (!isValidName(formData.studentFirstName)) {
      setError('Student first name must be a valid name (2-50 characters, letters only)')
      setSubmitting(false)
      return
    }

    // Validate student last name
    if (!formData.studentLastName || !formData.studentLastName.trim()) {
      setError('Student last name is required')
      setSubmitting(false)
      return
    }
    if (!isValidName(formData.studentLastName)) {
      setError('Student last name must be a valid name (2-50 characters, letters only)')
      setSubmitting(false)
      return
    }

    // Validate student date of birth if provided
    if (formData.studentDob && !isValidDateOfBirth(formData.studentDob)) {
      setError('Student date of birth must be a valid date (not in the future, age 0-120 years)')
      setSubmitting(false)
      return
    }

    // Validate phone number
    if (!formData.parentPhone || formData.parentPhone.trim() === '') {
      setError('Phone number is required')
      setSubmitting(false)
      return
    }
    if (!isValidPhone(formData.parentPhone)) {
      setError('Please enter a valid UK phone number')
      setSubmitting(false)
      return
    }

    // Validate address if provided
    if (formData.parentAddress && formData.parentAddress.trim() && !isValidAddressLine(formData.parentAddress)) {
      setError('Address must be a valid address (5-100 characters)')
      setSubmitting(false)
      return
    }

    // Validate postcode if provided
    if (formData.parentPostcode && formData.parentPostcode.trim() && !isValidUKPostcode(formData.parentPostcode)) {
      setError('Please enter a valid UK postcode')
      setSubmitting(false)
      return
    }
    
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/parent-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          parentTitle: formData.parentTitle || null,
          parentName: `${formData.parentFirstName} ${formData.parentLastName}`.trim(),
          parentPhone: formData.parentPhone,
          backupPhone: formData.backupPhone || null,
          studentFirstName: formData.studentFirstName,
          studentLastName: formData.studentLastName,
          studentDob: formData.studentDob || null,
          studentAllergies: formData.studentAllergies || null,
          studentMedicalNotes: formData.studentMedicalNotes || null,
          paymentMethod: formData.paymentMethod,
          parentAddress: formData.parentAddress || null,
          parentPostcode: formData.parentPostcode || null,
          giftAidStatus: formData.giftAidStatus
        })
      })

      if (!response.ok) {
        const error = await response.json()
        setError(error.error || 'Failed to complete setup')
        setSubmitting(false)
        return
      }

      const data = await response.json()

      // If Stripe selected, redirect to Stripe setup
      if (data.needsStripeSetup) {
        router.push(`/parent/payment-methods?setup=true`)
      } else {
        // Sign in and redirect
        router.push(`/auth/signin?setup=success`)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading || !invitationData) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-xl flex-col gap-6">
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

  if (error && !invitationData) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
          </a>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Invalid Invitation</h2>
            <p className="text-sm text-neutral-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const availableMethods = []
  // Show card first if available
  if (invitationData.paymentMethods.card) {
    availableMethods.push({ value: 'CARD', label: 'Card (automatic)', icon: CreditCard })
  }
  if (invitationData.paymentMethods.bankTransfer) {
    availableMethods.push({ value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: TrendingUp })
  }
  if (invitationData.paymentMethods.cash) {
    availableMethods.push({ value: 'CASH', label: 'Cash', icon: Coins })
  }

  // Define onboarding steps
  const onboardingSteps = [
    {
      id: 'password',
      title: 'Create your password',
      description: 'Set up a secure password for your account.',
      completed: completedSteps.has('password'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Create a secure password for your account.
          </p>
          
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
            
            {/* Password Requirements - Show all requirements (except lowercase) */}
            {passwordRequirements.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordRequirements
                  .filter(req => !req.text.toLowerCase().includes('lowercase'))
                  .map((req, index) => {
                    const isMet = formData.password ? req.met(formData.password) : false
                    return (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className={`w-1 h-1 rounded-full ${isMet ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={isMet ? 'text-green-600' : 'text-red-600'}>
                          {req.text}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
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
                className={`w-full pl-9 pr-9 h-10 text-sm rounded-md border bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 transition-colors ${
                  formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword 
                    ? 'border-red-300 focus:border-red-400' 
                    : formData.confirmPassword && formData.password && formData.password === formData.confirmPassword
                    ? 'border-green-300 focus:border-green-400'
                    : 'border-neutral-200/70 focus:border-neutral-400'
                }`}
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
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && formData.password && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('password')
              }
            }}
            disabled={!checkStepCompleted('password')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'parent-details',
      title: 'Parent information',
      description: 'Tell us about yourself.',
      completed: completedSteps.has('parent-details'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Provide your personal information.
          </p>

          {/* Title */}
          <div>
            <label htmlFor="parentTitle" className="block text-sm font-medium text-neutral-700 mb-1">
              Title (Optional)
            </label>
            <select
              id="parentTitle"
              name="parentTitle"
              value={formData.parentTitle || 'none'}
              onChange={(e) => setFormData({ ...formData, parentTitle: e.target.value === 'none' ? '' : e.target.value })}
              className="w-full px-3 py-2 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
            >
              <option value="none">None</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
            </select>
          </div>

          {/* First Name */}
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="parentFirstName"
                name="parentFirstName"
                type="text"
                required
                value={formData.parentFirstName}
                onChange={(e) => handleInputChange('parentFirstName', e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="First Name *"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="parentLastName"
                name="parentLastName"
                type="text"
                required
                value={formData.parentLastName}
                onChange={(e) => handleInputChange('parentLastName', e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Last Name *"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="parentPhone"
                name="parentPhone"
                type="tel"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className={`w-full pl-9 pr-3 h-10 text-sm rounded-md border bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 transition-colors ${
                  phoneError ? 'border-red-500 focus:border-red-600' : formData.parentPhone && isValidPhone(formData.parentPhone) ? 'border-green-500 focus:border-green-600' : 'border-neutral-200/70 focus:border-neutral-400'
                }`}
                placeholder="Phone * (e.g., +44 7700 900123 or 07700 900123)"
              />
            </div>
            {phoneError && (
              <p className="mt-1 text-xs text-red-600">{phoneError}</p>
            )}
            {formData.parentPhone && !phoneError && isValidPhone(formData.parentPhone) && (
              <p className="mt-1 text-xs text-green-600">Valid UK phone number</p>
            )}
          </div>

          {/* Backup Phone Number */}
          <div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="backupPhone"
                name="backupPhone"
                type="tel"
                value={formData.backupPhone}
                onChange={(e) => setFormData({ ...formData, backupPhone: e.target.value })}
                className={`w-full pl-9 pr-3 h-10 text-sm rounded-md border bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 transition-colors ${
                  formData.backupPhone && isValidPhone(formData.backupPhone) ? 'border-green-500 focus:border-green-600' : 'border-neutral-200/70 focus:border-neutral-400'
                }`}
                placeholder="Backup Phone Number (optional)"
              />
            </div>
            {formData.backupPhone && isValidPhone(formData.backupPhone) && (
              <p className="mt-1 text-xs text-green-600">Valid UK phone number</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('parent-details')
              }
            }}
            disabled={!checkStepCompleted('parent-details')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'student-details',
      title: 'Student information',
      description: 'Update your child\'s details.',
      completed: completedSteps.has('student-details'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Review and update your child's information.
          </p>

          {/* Student First Name */}
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="studentFirstName"
                name="studentFirstName"
                type="text"
                required
                value={formData.studentFirstName}
                onChange={(e) => handleInputChange('studentFirstName', e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="First Name *"
              />
            </div>
          </div>

          {/* Student Last Name */}
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="studentLastName"
                name="studentLastName"
                type="text"
                required
                value={formData.studentLastName}
                onChange={(e) => handleInputChange('studentLastName', e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Last Name *"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="studentDob"
                name="studentDob"
                type="date"
                value={formData.studentDob}
                onChange={(e) => setFormData({ ...formData, studentDob: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
              />
            </div>
          </div>

          {/* Allergies */}
          <div>
            <input
              id="studentAllergies"
              name="studentAllergies"
              type="text"
              value={formData.studentAllergies}
              onChange={(e) => setFormData({ ...formData, studentAllergies: e.target.value })}
              className="w-full px-3 py-2 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
              placeholder="Allergies (optional)"
            />
          </div>

          {/* Medical Notes */}
          <div>
            <textarea
              id="studentMedicalNotes"
              name="studentMedicalNotes"
              value={formData.studentMedicalNotes}
              onChange={(e) => setFormData({ ...formData, studentMedicalNotes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors resize-none"
              placeholder="Medical Notes (optional)"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('student-details')
              }
            }}
            disabled={!checkStepCompleted('student-details')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'address',
      title: 'Address & Postcode',
      description: 'Required for tax purposes.',
      completed: completedSteps.has('address'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Address and postcode are required.
          </p>

          {/* Address */}
          <div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="parentAddress"
                name="parentAddress"
                type="text"
                value={formData.parentAddress}
                onChange={(e) => handleInputChange('parentAddress', e.target.value)}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Address"
              />
            </div>
          </div>

          {/* Postcode */}
          <div>
            <input
              id="parentPostcode"
              name="parentPostcode"
              type="text"
              value={formData.parentPostcode}
              onChange={(e) => handleInputChange('parentPostcode', e.target.value)}
              className={`w-full px-3 py-2 h-10 text-sm rounded-md border bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0 transition-colors ${
                postcodeError ? 'border-red-500 focus:border-red-600' : formData.parentPostcode && isValidUKPostcode(formData.parentPostcode) ? 'border-green-500 focus:border-green-600' : 'border-neutral-200/70 focus:border-neutral-400'
              }`}
              placeholder="Postcode (e.g., SW1A 1AA)"
              maxLength={10}
            />
            {postcodeError && (
              <p className="mt-1 text-xs text-red-600">{postcodeError}</p>
            )}
            {formData.parentPostcode && !postcodeError && isValidUKPostcode(formData.parentPostcode) && (
              <p className="mt-1 text-xs text-green-600">Valid UK postcode</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('address')
              }
            }}
            disabled={!checkStepCompleted('address')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'payment',
      title: 'Payment method',
      description: `Choose how you'd like to pay the monthly fee of £${invitationData.class.monthlyFee.toFixed(2)}.`,
      completed: completedSteps.has('payment'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Select your preferred payment method for {invitationData.class.name}.
          </p>

          <div className="flex flex-col gap-3">
            {availableMethods.map((method) => {
              const Icon = method.icon
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    formData.paymentMethod === method.value
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-neutral-500" strokeWidth={method.value === 'CASH' ? 1.5 : undefined} />
                    <span className="font-medium text-neutral-900">{method.label}</span>
                    {formData.paymentMethod === method.value && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Bank Transfer Details */}
          {formData.paymentMethod === 'BANK_TRANSFER' && invitationData.bankDetails && (
            <div className="mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
              <h4 className="font-semibold text-neutral-900 mb-3 text-sm">Bank Transfer Details</h4>
              {invitationData.bankDetails.accountName && (
                <div className="mb-2 text-sm">
                  <span className="font-medium text-neutral-800">Account Name:</span>
                  <span className="text-neutral-900 ml-2">{invitationData.bankDetails.accountName}</span>
                </div>
              )}
              {invitationData.bankDetails.sortCode && (
                <div className="mb-2 text-sm">
                  <span className="font-medium text-neutral-800">Sort Code:</span>
                  <span className="text-neutral-900 ml-2">{invitationData.bankDetails.sortCode}</span>
                </div>
              )}
              {invitationData.bankDetails.accountNumber && (
                <div className="mb-3 text-sm">
                  <span className="font-medium text-neutral-800">Account Number:</span>
                  <span className="text-neutral-900 ml-2">{invitationData.bankDetails.accountNumber}</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-neutral-300">
                <p className="text-sm font-medium text-neutral-900 mb-1">Setting up a Standing Order:</p>
                <p className="text-sm text-neutral-700">
                  You can set up a standing order with your bank using these details to automatically pay your monthly fees.
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('payment')
              }
            }}
            disabled={!checkStepCompleted('payment')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'gift-aid',
      title: 'Gift Aid declaration',
      description: 'Help the madrasah claim Gift Aid on your payments.',
      completed: completedSteps.has('gift-aid'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <h4 className="font-semibold text-neutral-900 mb-2 text-sm">What is Gift Aid?</h4>
            <p className="text-sm text-neutral-800 mb-2">
              Gift Aid allows the madrasah to claim back 25% of the tax you've already paid on your payments.
            </p>
            <p className="text-sm text-neutral-800">
              By selecting "Yes", you're confirming you're a UK taxpayer and want the madrasah to claim Gift Aid on your payments.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="giftAidStatus"
                value="YES"
                checked={formData.giftAidStatus === 'YES'}
                onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-900">
                I am a UK taxpayer, I would like Gift Aid to be claimed on my payments to {invitationData.org.name}
              </span>
            </label>
            
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="giftAidStatus"
                value="NO"
                checked={formData.giftAidStatus === 'NO'}
                onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-900">
                I am not a UK taxpayer, I would not like Gift Aid to be claimed at the moment
              </span>
            </label>
            
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="giftAidStatus"
                value="NOT_SURE"
                checked={formData.giftAidStatus === 'NOT_SURE'}
                onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900"
              />
              <span className="text-sm font-medium text-neutral-900">
                I am not sure at the moment
              </span>
            </label>
          </div>

          {formData.giftAidStatus === 'YES' && (!formData.parentAddress || !formData.parentAddress.trim() || !formData.parentPostcode || !formData.parentPostcode.trim() || !isValidUKPostcode(formData.parentPostcode)) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                Address and postcode are required when selecting Gift Aid. Please go back to the "Address & Postcode" step and fill them in.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if ((window as any).__onboardingNextStep) {
                (window as any).__onboardingNextStep('gift-aid')
              }
            }}
            disabled={!checkStepCompleted('gift-aid')}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )
    },
    {
      id: 'submit',
      title: 'Review and complete',
      description: 'Review your information and complete your account setup.',
      completed: false,
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-muted-foreground w-full sm:max-w-64 md:max-w-xs mb-4">
            Review your information and complete your account setup.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={submitting || !checkStepCompleted('gift-aid')}
              className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Completing...
                </>
              ) : (
                'Complete Setup'
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
          <h1 className="text-2xl font-semibold text-neutral-900">Welcome to {invitationData.org.name}</h1>
          <p className="text-sm text-neutral-600 mt-1">Complete your account setup</p>
        </div>

        <Onboarding01
          steps={onboardingSteps}
          title="Complete your account setup"
        />
      </div>
    </div>
  )
}

export default function ParentSetupPage() {
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
      <ParentSetupForm />
    </Suspense>
  )
}
