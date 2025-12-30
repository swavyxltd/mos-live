'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { Mail, Lock, User, Calendar, AlertCircle, Loader2, CheckCircle, Phone, MapPin, CreditCard, Gift, Building2, Coins, Shield, PhoneCall, Globe, MessageSquare, Info, Copy } from 'lucide-react'
import { isValidEmail, isValidDateOfBirth, isValidName, isValidPhone, isValidUKPostcode } from '@/lib/input-validation'
import { Onboarding01 } from '@/components/onboarding-01'
import { formatDate } from '@/lib/utils'

interface VerifiedStudent {
  id: string
  firstName: string
  lastName: string
  dob: string | null
  classes: Array<{
    id: string
    name: string
  }>
  claimStatus: string
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
    slug: string
  }
  students: Array<{
    id: string
    firstName: string
    lastName: string
    classes: Array<{
      id: string
      name: string
    }>
  }>
}

function ParentSignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const applicationId = searchParams.get('applicationId')
  const orgSlug = searchParams.get('org') // Get orgSlug from URL query param
  const token = searchParams.get('token') // Get token from URL query param

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verifiedStudent, setVerifiedStudent] = useState<VerifiedStudent | null>(null)
  const [multipleStudents, setMultipleStudents] = useState<VerifiedStudent[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<any>(null)

  // Verify child form data (only shown when no applicationId)
  const [verifyFormData, setVerifyFormData] = useState({
    childFirstName: '',
    childLastName: '',
    childDob: ''
  })

  // Signup form data - all parent details
  const [formData, setFormData] = useState({
    // Account details
    email: '',
    password: '',
    confirmPassword: '',
    // Personal information
    title: '',
    firstName: '',
    lastName: '',
    phone: '',
    backupPhone: '',
    address: '',
    city: '',
    postcode: '',
    relationshipToStudent: 'PARENT',
    // Payment & Gift Aid
    preferredPaymentMethod: '',
    giftAidStatus: ''
  })

  const [paymentSettings, setPaymentSettings] = useState<{
    acceptsCard: boolean
    acceptsCash: boolean
    acceptsBankTransfer: boolean
    hasStripeConfigured: boolean
    hasStripeConnect: boolean
    stripeEnabled: boolean
    bankAccountName: string | null
    bankSortCode: string | null
    bankAccountNumber: string | null
    paymentInstructions: string | null
    billingDay: number
  } | null>(null)

  const [showSignupForm, setShowSignupForm] = useState(false)
  const [currentStep, setCurrentStep] = useState<'account' | 'personal' | 'payment'>('account')
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (applicationId) {
      // Case A: Application flow - skip verification
      fetchApplicationData()
    } else if (token) {
      // Case C: Token-based invitation flow - fetch invitation and pre-fill
      fetchInvitationData()
    } else {
      // Case B: Normal flow - need to verify child first
      // orgSlug should be provided as query param: /parent/signup?org=org-slug
      if (!orgSlug) {
        setError('Organisation is required. Please use the link provided by your madrasah.')
        setLoading(false)
        return
      }
      // Fetch org name
      fetchOrgName()
      setLoading(false)
    }
  }, [applicationId, orgSlug, token])

  const fetchOrgName = async () => {
    if (!orgSlug) return
    try {
      const response = await fetch(`/api/public/org-by-slug?slug=${orgSlug}`)
      if (response.ok) {
        const data = await response.json()
        setOrgName(data.name)
      }
    } catch (err) {
      // Silently fail - org name is not critical
    }
  }

  const fetchInvitationData = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`/api/auth/parent-invitation?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid or expired invitation link')
        setLoading(false)
        return
      }

      setInvitationData(data)
      setOrgName(data.org?.name || null)
      
      // Pre-fill form with invitation data
      setFormData(prev => ({
        ...prev,
        email: data.invitation?.parentEmail || prev.email,
        firstName: data.parent?.name?.split(' ')[0] || prev.firstName,
        lastName: data.parent?.name?.split(' ').slice(1).join(' ') || prev.lastName,
        phone: data.parent?.phone || prev.phone
      }))

      // Set verified student from invitation
      if (data.student) {
        setVerifiedStudent({
          id: data.student.id,
          firstName: data.student.firstName,
          lastName: data.student.lastName,
          dob: data.student.dob,
          classes: data.class ? [{
            id: data.class.id,
            name: data.class.name
          }] : [],
          claimStatus: 'VERIFIED'
        })
        setSelectedStudentId(data.student.id)
      }

      // Fetch payment settings - we need org slug, so try to get it from org name
      // For now, we'll use the payment methods from the invitation data
      if (data.paymentMethods) {
        setPaymentSettings({
          acceptsCard: data.paymentMethods.card || false,
          acceptsCash: data.paymentMethods.cash ?? true,
          acceptsBankTransfer: data.paymentMethods.bankTransfer ?? true,
          hasStripeConfigured: data.paymentMethods.stripe || false,
          hasStripeConnect: data.paymentMethods.card || false,
          stripeEnabled: data.paymentMethods.stripe || false,
          bankAccountName: data.bankDetails?.accountName || null,
          bankSortCode: data.bankDetails?.sortCode || null,
          bankAccountNumber: data.bankDetails?.accountNumber || null,
          paymentInstructions: data.paymentInstructions || null,
          billingDay: data.billingDay ?? null
        })
      }
      
      setShowSignupForm(true) // Skip verification, show signup form directly
      setLoading(false)
    } catch (err) {
      setError('Failed to load invitation details')
      setLoading(false)
    }
  }

  const fetchApplicationData = async () => {
    try {
      const response = await fetch('/api/applications/get-by-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid application link')
        setLoading(false)
        return
      }

      setApplicationData(data)
      // Pre-fill email and name from application
      setFormData(prev => ({ 
        ...prev, 
        email: data.application.guardianEmail,
        name: data.application.guardianName
      }))
      
      // Fetch payment settings for this org (pass slug directly since state update is async)
      if (data.org?.slug) {
        await fetchPaymentSettings(data.org.slug)
      } else {
        console.error('No org slug in application data:', data)
      }
      
      setShowSignupForm(true) // Skip verification, show signup form directly
      setLoading(false)
    } catch (err) {
      setError('Failed to load application details')
      setLoading(false)
    }
  }

  const fetchPaymentSettings = async (orgSlugParam?: string) => {
    try {
      // Use passed slug, or from URL, or from application data
      const slugToUse = orgSlugParam || applicationData?.org?.slug || orgSlug
      if (!slugToUse) {
        console.log('No orgSlug available for fetching payment settings')
        return
      }

      console.log('Fetching payment settings for orgSlug:', slugToUse)
      // Fetch from public endpoint
      const response = await fetch(`/api/public/payment-methods?orgSlug=${slugToUse}`)
      
      if (response.ok) {
        const settings = await response.json()
        console.log('Payment settings received:', settings)
        setPaymentSettings({
          acceptsCard: Boolean(settings.acceptsCard),
          acceptsCash: Boolean(settings.acceptsCash),
          acceptsBankTransfer: Boolean(settings.acceptsBankTransfer),
          hasStripeConfigured: Boolean(settings.hasStripeConfigured),
          hasStripeConnect: Boolean(settings.hasStripeConnect),
          stripeEnabled: Boolean(settings.stripeEnabled),
          bankAccountName: settings.bankAccountName || null,
          bankSortCode: settings.bankSortCode || null,
          bankAccountNumber: settings.bankAccountNumber || null,
          paymentInstructions: settings.paymentInstructions || null,
          billingDay: settings.billingDay ?? null
        })
      } else {
        console.error('Failed to fetch payment settings:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error data:', errorData)
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err)
      // Default to all payment methods off if fetch fails
      setPaymentSettings({
        acceptsCard: false,
        acceptsCash: false,
        acceptsBankTransfer: false,
        hasStripeConfigured: false,
        hasStripeConnect: false,
        stripeEnabled: false,
        bankAccountName: null,
        bankSortCode: null,
        bankAccountNumber: null,
        paymentInstructions: null,
        billingDay: null
      })
    }
  }

  const handleVerifyChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!verifyFormData.childFirstName || !verifyFormData.childLastName || !verifyFormData.childDob) {
      setError('Please fill in all child verification fields')
      return
    }

    if (!isValidName(verifyFormData.childFirstName.trim())) {
      setError('Please enter a valid first name')
      return
    }

    if (!isValidName(verifyFormData.childLastName.trim())) {
      setError('Please enter a valid last name')
      return
    }

    if (!isValidDateOfBirth(verifyFormData.childDob)) {
      setError('Please enter a valid date of birth')
      return
    }

    setSubmitting(true)

    try {
      if (!orgSlug) {
        setError('Organisation is required. Please use the link provided by your madrasah.')
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/public/verify-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childFirstName: verifyFormData.childFirstName.trim(),
          childLastName: verifyFormData.childLastName.trim(),
          childDob: verifyFormData.childDob,
          orgSlug: orgSlug
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to verify child')
        setSubmitting(false)
        return
      }

      if (data.multipleMatches) {
        // Multiple students found - let parent choose
        setMultipleStudents(data.students)
        setSelectedStudentId(null)
        setSubmitting(false)
        return
      }

      // Single match - proceed
      setVerifiedStudent(data.student)
      setSelectedStudentId(data.student.id)
      
      // Fetch payment settings
      // Fetch payment settings - use orgSlug from URL if available
      if (orgSlug) {
        await fetchPaymentSettings(orgSlug)
      } else if (applicationData?.org?.slug) {
        await fetchPaymentSettings(applicationData.org.slug)
      }
      
      setShowSignupForm(true) // Hide verification, show signup form
      setSubmitting(false)
    } catch (err) {
      setError('An error occurred during verification. Please try again.')
      setSubmitting(false)
    }
  }

  const handleSelectStudent = (studentId: string) => {
    const student = multipleStudents.find(s => s.id === studentId)
    if (student) {
      setVerifiedStudent(student)
      setSelectedStudentId(studentId)
      setMultipleStudents([])
      setShowSignupForm(true)
    }
  }

  // Update completed steps
  useEffect(() => {
    const newCompleted = new Set<string>()
    
    if (applicationId && applicationData) {
      newCompleted.add('verify')
    } else if (verifiedStudent && selectedStudentId) {
      newCompleted.add('verify')
    }
    
    // Account step
    if (formData.email && isValidEmail(formData.email) && 
        formData.password && formData.password.length >= 8 &&
        formData.password === formData.confirmPassword) {
      newCompleted.add('account')
    }
    
    // Personal info step
    if (formData.firstName && formData.firstName.trim().length >= 1 && formData.lastName && formData.lastName.trim().length >= 1) {
      newCompleted.add('personal')
    }
    
    // Payment step (at least one method should be selected if available)
    if (paymentSettings) {
      const hasAvailableMethods = paymentSettings.acceptsCard || paymentSettings.acceptsCash || paymentSettings.acceptsBankTransfer
      if (!hasAvailableMethods || formData.preferredPaymentMethod) {
        newCompleted.add('payment')
      }
    }
    
    setCompletedSteps(newCompleted)
  }, [applicationId, applicationData, verifiedStudent, selectedStudentId, formData, paymentSettings])

  const handleNextStep = () => {
    if (currentStep === 'account') {
      // Validate account step
      if (!formData.email || !isValidEmail(formData.email)) {
        setError('Please enter a valid email address')
        return
      }
      if (!formData.password || formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      setCurrentStep('personal')
      setError('')
      // Call Onboarding01's handleNextStep to open the next step
      if (typeof window !== 'undefined' && (window as any).__onboardingNextStep) {
        (window as any).__onboardingNextStep('account')
      }
    } else if (currentStep === 'personal') {
      // Validate personal step
      if (!formData.firstName || formData.firstName.trim().length < 1) {
        setError('Please enter your first name')
        return
      }
      if (!formData.lastName || formData.lastName.trim().length < 1) {
        setError('Please enter your last name')
        return
      }
      if (formData.phone && !isValidPhone(formData.phone)) {
        setError('Please enter a valid phone number')
        return
      }
      if (formData.postcode && !isValidUKPostcode(formData.postcode)) {
        setError('Please enter a valid UK postcode')
        return
      }
      setCurrentStep('payment')
      setError('')
      // Call Onboarding01's handleNextStep to open the next step
      if (typeof window !== 'undefined' && (window as any).__onboardingNextStep) {
        (window as any).__onboardingNextStep('personal')
      }
    } else if (currentStep === 'payment') {
      // Payment step - validate if payment method is required
      if (paymentSettings) {
        const hasAvailableMethods = paymentSettings.acceptsCard || paymentSettings.acceptsCash || paymentSettings.acceptsBankTransfer
        if (hasAvailableMethods && !formData.preferredPaymentMethod) {
          setError('Please select a payment method')
          return
        }
      }
      setError('')
      // Call Onboarding01's handleNextStep to open the next step (Gift Aid)
      if (typeof window !== 'undefined' && (window as any).__onboardingNextStep) {
        (window as any).__onboardingNextStep('payment')
      }
    }
  }

  const handleBackStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('personal')
      setError('')
      // Call Onboarding01's handleBackStep to go back to previous step
      if (typeof window !== 'undefined' && (window as any).__onboardingBackStep) {
        (window as any).__onboardingBackStep('payment')
      }
    } else if (currentStep === 'personal') {
      setCurrentStep('account')
      setError('')
      // Call Onboarding01's handleBackStep to go back to previous step
      if (typeof window !== 'undefined' && (window as any).__onboardingBackStep) {
        (window as any).__onboardingBackStep('personal')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // Final validation
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

    if (!formData.firstName || formData.firstName.trim().length < 1) {
      setError('Please enter your first name')
      setSubmitting(false)
      return
    }

    if (!formData.lastName || formData.lastName.trim().length < 1) {
      setError('Please enter your last name')
      setSubmitting(false)
      return
    }

    if (!formData.city || formData.city.trim().length < 2) {
      setError('Please enter your city')
      setSubmitting(false)
      return
    }

    if (!formData.title || formData.title.trim().length === 0) {
      setError('Please select a title')
      setSubmitting(false)
      return
    }

    if (!formData.address || formData.address.trim().length === 0) {
      setError('Please enter your address')
      setSubmitting(false)
      return
    }

    if (!formData.postcode || !isValidUKPostcode(formData.postcode)) {
      setError('Please enter a valid UK postcode')
      setSubmitting(false)
      return
    }

    if (!formData.phone || !isValidPhone(formData.phone)) {
      setError('Please enter a valid phone number')
      setSubmitting(false)
      return
    }

    if (formData.backupPhone && !isValidPhone(formData.backupPhone)) {
      setError('Please enter a valid backup phone number')
      setSubmitting(false)
      return
    }

    if (!formData.giftAidStatus || formData.giftAidStatus.trim() === '') {
      setError('Please select a Gift Aid declaration option')
      setSubmitting(false)
      return
    }

    try {
      const signupData: any = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        title: formData.title || undefined,
        phone: formData.phone || undefined,
        backupPhone: formData.backupPhone || undefined,
        address: formData.address || undefined,
        city: formData.city.trim() || undefined,
        postcode: formData.postcode || undefined,
        relationshipToStudent: formData.relationshipToStudent || 'PARENT',
        preferredPaymentMethod: formData.preferredPaymentMethod || undefined,
        giftAidStatus: formData.giftAidStatus
      }

      if (token && invitationData) {
        // Token-based invitation flow - use token
        signupData.token = token
      } else if (applicationId && applicationData) {
        // Application flow - link to all students from application
        signupData.applicationId = applicationId
      } else if (selectedStudentId && verifiedStudent) {
        // Normal flow - link to verified student
        signupData.studentId = selectedStudentId
      } else {
        setError('Please verify your child first')
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/auth/parent-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setSubmitting(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
        {/* Background image - same as auth page */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/auth-bg.png)'
          }}
        />
        
        {/* Content - centered with relative z-index */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
          <div className="flex w-[60vw] flex-col gap-6">
            <a href="/" className="flex items-center gap-2 self-center">
              <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
            </a>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
        {/* Background image - same as auth page */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/auth-bg.png)'
          }}
        />
        
        {/* Content - centered with relative z-index */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
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
      </div>
    )
  }

  // Determine page title
  const pageTitle = `Create Your Parent Account`
  
  const pageSubtitle = applicationId && applicationData
    ? `Alhamdulillah! Your child's application has been accepted. Create your account to access the Parent Portal and stay up to date with your child's progress.`
    : verifiedStudent
    ? `Verified: ${verifiedStudent.firstName} ${verifiedStudent.lastName}`
    : `Verify your child's details to create your Parent Portal account.`

  // Define onboarding steps - verification step is now shown separately above the form
  const canProceedToSignup = showSignupForm || (applicationId && applicationData);
  
  const onboardingSteps = [
    // Step 1: Account Details
    {
      id: 'account',
      title: 'Account Details',
      description: 'Set up your email and password.',
      completed: completedSteps.has('account'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {applicationId && applicationData && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-green-600">Madrasah</label>
                  <p className="text-sm font-medium text-green-900">
                    {applicationData.org.name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-green-600">Parent Name</label>
                  <p className="text-sm font-medium text-green-900">
                    {applicationData.application.guardianName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-green-600">Children</label>
                  <div className="space-y-1">
                    {applicationData.application.children.map((child, idx) => (
                      <p key={idx} className="text-sm font-medium text-green-900">
                        {child.firstName} {child.lastName}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                disabled={!!applicationId && !!applicationData}
              />
            </div>
            {applicationId && applicationData && (
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

          <button
            type="button"
            onClick={handleNextStep}
            disabled={!canProceedToSignup}
            className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Personal Information
          </button>
        </div>
      )
    },
    // Step 2: Personal Information
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Tell us about yourself.',
      completed: completedSteps.has('personal'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
              Title *
            </label>
            <select
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors px-3"
            >
              <option value="">Select title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
            </select>
          </div>

          {/* First Name and Last Name - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ ...formData, firstName: value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value })
                  }}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="First name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1">
                Last Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ ...formData, lastName: value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value })
                  }}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>

          {/* Phone Number and Backup Phone - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="07123456789"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Primary contact</p>
            </div>
            <div>
              <label htmlFor="backupPhone" className="block text-sm font-medium text-neutral-700 mb-1">
                Backup Phone Number
              </label>
              <div className="relative">
                <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="backupPhone"
                  name="backupPhone"
                  type="tel"
                  value={formData.backupPhone}
                  onChange={(e) => setFormData({ ...formData, backupPhone: e.target.value })}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="07123456789"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Alternative (optional)</p>
            </div>
          </div>

          {/* Relationship to Student */}
          <div>
            <label htmlFor="relationshipToStudent" className="block text-sm font-medium text-neutral-700 mb-1">
              Relationship to Student *
            </label>
            <select
              id="relationshipToStudent"
              name="relationshipToStudent"
              required
              value={formData.relationshipToStudent}
              onChange={(e) => setFormData({ ...formData, relationshipToStudent: e.target.value })}
              className="w-full h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors px-3"
            >
              <option value="PARENT">Parent</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GRANDPARENT">Grandparent</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Address - One Line */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-neutral-700 mb-1">
              Address Line 1 *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                placeholder="Enter your address"
              />
            </div>
          </div>

          {/* Postcode and City - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-neutral-700 mb-1">
                Postcode *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="postcode"
                  name="postcode"
                  type="text"
                  required
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-neutral-700 mb-1">
                City *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ ...formData, city: value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value })
                  }}
                  className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                  placeholder="Enter your city"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBackStep}
              className="flex-1 h-10 text-sm rounded-md border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )
    },
    // Step 3: Payment Setup
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Select your preferred payment method.',
      completed: completedSteps.has('payment'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Payment Method */}
          {paymentSettings && (paymentSettings.acceptsCard || paymentSettings.acceptsCash || paymentSettings.acceptsBankTransfer) && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Preferred Payment Method *
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select how you would like to pay fees. You can change this later in your account settings.
              </p>
              
              {/* Billing Date Info */}
              {paymentSettings.billingDay && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-xs font-medium text-gray-900">Payment Date</span>
                  </div>
                  <p className="text-xs text-gray-800">
                    Fees are due on the <strong>{paymentSettings.billingDay}{paymentSettings.billingDay === 1 ? 'st' : paymentSettings.billingDay === 2 ? 'nd' : paymentSettings.billingDay === 3 ? 'rd' : 'th'}</strong> of each month.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {paymentSettings.acceptsCard && (
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CARD"
                      checked={formData.preferredPaymentMethod === 'CARD'}
                      onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value })}
                      className="w-4 h-4 mt-0.5 accent-green-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-neutral-900">Card Payment</span>
                        {paymentSettings.hasStripeConnect && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-700 border border-gray-200">
                            <Shield className="h-3 w-3" />
                            Secure
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600">
                        Automatic payments via {paymentSettings.hasStripeConnect ? 'Stripe' : 'card'}.{paymentSettings.billingDay && <> Fees are charged automatically on the {paymentSettings.billingDay}{paymentSettings.billingDay === 1 ? 'st' : paymentSettings.billingDay === 2 ? 'nd' : paymentSettings.billingDay === 3 ? 'rd' : 'th'} of each month.</>}
                      </p>
                    </div>
                  </label>
                )}
                {paymentSettings.acceptsBankTransfer && (
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={formData.preferredPaymentMethod === 'BANK_TRANSFER'}
                      onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value })}
                      className="w-4 h-4 mt-0.5 accent-green-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-neutral-900">Bank Transfer</span>
                      </div>
                      {paymentSettings.bankAccountName && paymentSettings.bankSortCode && paymentSettings.bankAccountNumber ? (
                        <div className="space-y-2">
                          <p className="text-xs text-neutral-600">
                            Set up a standing order for automatic monthly payments.
                          </p>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-3">
                              <Info className="h-4 w-4 text-gray-600" />
                              <p className="text-xs font-medium text-gray-900">Standing Order Details</p>
                            </div>
                            <div className="space-y-2 text-xs text-gray-800 mb-3">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Account Name:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{paymentSettings.bankAccountName}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(paymentSettings.bankAccountName || '')
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy account name"
                                  >
                                    <Copy className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Sort Code:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{paymentSettings.bankSortCode}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(paymentSettings.bankSortCode || '')
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy sort code"
                                  >
                                    <Copy className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Account Number:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{paymentSettings.bankAccountNumber}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigator.clipboard.writeText(paymentSettings.bankAccountNumber || '')
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy account number"
                                  >
                                    <Copy className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Payment Date:</span>
                                <span>{paymentSettings.billingDay ? <>The {paymentSettings.billingDay}{paymentSettings.billingDay === 1 ? 'st' : paymentSettings.billingDay === 2 ? 'nd' : paymentSettings.billingDay === 3 ? 'rd' : 'th'} of each month</> : 'As agreed'}</span>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-white border border-gray-200 rounded">
                              <p className="text-xs font-medium text-gray-900 mb-1">How to set up:</p>
                              <p className="text-xs text-gray-800">
                                Set up a standing order through your online banking or mobile banking app using the details above. 
                                Once set up, payments will be made automatically each month—no need to remember to pay manually!
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-600">
                          Manual bank transfer. You will receive payment instructions via email.
                        </p>
                      )}
                    </div>
                  </label>
                )}
                {paymentSettings.acceptsCash && (
                  <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="CASH"
                      checked={formData.preferredPaymentMethod === 'CASH'}
                      onChange={(e) => setFormData({ ...formData, preferredPaymentMethod: e.target.value })}
                      className="w-4 h-4 mt-0.5 accent-green-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-neutral-900">Cash</span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        Pay in person at the madrasah office{paymentSettings.billingDay ? <> by the {paymentSettings.billingDay}{paymentSettings.billingDay === 1 ? 'st' : paymentSettings.billingDay === 2 ? 'nd' : paymentSettings.billingDay === 3 ? 'rd' : 'th'} of each month</> : ''}. Please bring exact change when possible.
                      </p>
                    </div>
                  </label>
                )}
              </div>
              {paymentSettings.paymentInstructions && (
                <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <p className="text-xs font-medium text-neutral-700 mb-1">Additional Payment Instructions:</p>
                  <p className="text-xs text-neutral-600 whitespace-pre-line">{paymentSettings.paymentInstructions}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBackStep}
              className="flex-1 h-10 text-sm rounded-md border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Continue to Gift Aid
            </button>
          </div>
        </div>
      )
    },
    // Step 4: Gift Aid Declaration
    {
      id: 'giftAid',
      title: 'Gift Aid Declaration',
      description: 'Help the madrasah claim Gift Aid on your donations.',
      completed: completedSteps.has('giftAid'),
      customContent: (
        <div className="mt-2 space-y-4" onClick={(e) => e.stopPropagation()}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Gift Aid Declaration *
            </label>
            <p className="text-xs text-neutral-500 mb-4">
              Gift Aid allows the madrasah to claim an extra 25% from the government on your donations at no extra cost to you.
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="giftAid"
                  value="ELIGIBLE"
                  checked={formData.giftAidStatus === 'ELIGIBLE'}
                  onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                  className="w-4 h-4"
                />
                <Gift className="h-4 w-4 text-green-500" />
                <span className="text-sm">Yes, I am eligible for Gift Aid</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="giftAid"
                  value="NOT_SURE"
                  checked={formData.giftAidStatus === 'NOT_SURE'}
                  onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                  className="w-4 h-4"
                />
                <Gift className="h-4 w-4 text-neutral-400" />
                <span className="text-sm">I'm not sure</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="giftAid"
                  value="NOT_ELIGIBLE"
                  checked={formData.giftAidStatus === 'NOT_ELIGIBLE'}
                  onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                  className="w-4 h-4"
                />
                <Gift className="h-4 w-4 text-neutral-400" />
                <span className="text-sm">No, I am not eligible</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackStep}
                className="flex-1 h-10 text-sm rounded-md border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || (!applicationId && !selectedStudentId)}
                className="flex-1 h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      )
    }
  ]

  // Show verification form if no applicationId and not yet verified
  const showVerificationForm = !applicationId && !canProceedToSignup

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
      {/* Background image - same as auth page */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Content - centered with relative z-index */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full md:w-[60vw] flex-col gap-6">
        {/* Logo/Branding */}
        <a href="/" className="flex items-center gap-2 self-center">
          <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
        </a>

        <div className="text-center mb-2">
          <h1 className="text-lg sm:text-xl font-semibold text-neutral-900">{pageTitle}</h1>
          <p className="text-sm text-neutral-600 mt-1">{pageSubtitle}</p>
        </div>

        {/* Prominent Student Information Banner */}
        {(verifiedStudent && selectedStudentId) || (applicationId && applicationData) || (token && invitationData) ? (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Signing up for</span>
                </div>
                {applicationId && applicationData ? (
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">
                      {applicationData.application.children.map((child, idx) => (
                        <span key={idx}>
                          {child.firstName} {child.lastName}
                          {idx < applicationData.application.children.length - 1 && ', '}
                        </span>
                      ))}
                    </h3>
                    {applicationData.org.name && (
                      <p className="text-sm text-emerald-700 mt-1">
                        at {applicationData.org.name}
                      </p>
                    )}
                  </div>
                ) : (verifiedStudent || invitationData?.student) ? (
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900">
                      {verifiedStudent?.firstName || invitationData?.student?.firstName} {verifiedStudent?.lastName || invitationData?.student?.lastName}
                    </h3>
                    {(verifiedStudent?.classes.length > 0 || invitationData?.class) && (
                      <p className="text-sm text-emerald-700 mt-1">
                        Class: {verifiedStudent?.classes.map(c => c.name).join(', ') || invitationData?.class?.name}
                      </p>
                    )}
                    {(orgName || invitationData?.org?.name) && (
                      <p className="text-sm text-emerald-700 mt-1">
                        at {orgName || invitationData?.org?.name}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Student Verification Form - Shown BEFORE signup form */}
        {showVerificationForm && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Verify Your Child</h2>
            <p className="text-sm text-neutral-600 mb-6">
              Please enter your child's details to verify they are enrolled at the madrasah.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Multiple students selection */}
            {multipleStudents.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Multiple students found. Please select which one is yours:
                </p>
                {multipleStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelectStudent(student.id)}
                    className="w-full p-4 border border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div className="font-medium text-neutral-900">
                      {student.firstName} {student.lastName}
                    </div>
                    {student.dob && (
                      <div className="text-sm text-neutral-600 mt-1">
                        DOB: {formatDate(student.dob)}
                      </div>
                    )}
                    {student.classes.length > 0 && (
                      <div className="text-sm text-neutral-600">
                        Class: {student.classes.map(c => c.name).join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Verify child form */}
            {multipleStudents.length === 0 && (
              <form onSubmit={handleVerifyChild} className="space-y-4">
                <div>
                  <label htmlFor="childFirstName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Child First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="childFirstName"
                      name="childFirstName"
                      type="text"
                      required
                      value={verifyFormData.childFirstName}
                      onChange={(e) => {
                        const value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                        setVerifyFormData({ ...verifyFormData, childFirstName: value })
                        setError('')
                      }}
                      className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                      placeholder="Enter first name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="childLastName" className="block text-sm font-medium text-neutral-700 mb-1">
                    Child Last Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="childLastName"
                      name="childLastName"
                      type="text"
                      required
                      value={verifyFormData.childLastName}
                      onChange={(e) => {
                        const value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                        setVerifyFormData({ ...verifyFormData, childLastName: value })
                        setError('')
                      }}
                      className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="childDob" className="block text-sm font-medium text-neutral-700 mb-1">
                    Child Date of Birth *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      id="childDob"
                      name="childDob"
                      type="date"
                      required
                      value={verifyFormData.childDob}
                      onChange={(e) => {
                        setVerifyFormData({ ...verifyFormData, childDob: e.target.value })
                        setError('')
                      }}
                      className="w-full pl-9 pr-3 h-10 text-sm rounded-md border border-neutral-200/70 bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-0 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 text-sm rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Child'
                  )}
                </button>
              </form>
            )}

            {/* Show verified student info */}
            {verifiedStudent && selectedStudentId && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Child verified</span>
                </div>
                <div className="space-y-1 text-sm text-green-800">
                  <p><strong>Student:</strong> {verifiedStudent.firstName} {verifiedStudent.lastName}</p>
                  {verifiedStudent.classes.length > 0 && (
                    <p><strong>Class:</strong> {verifiedStudent.classes.map(c => c.name).join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signup Form - Only shown after verification or if applicationId is present */}
        {canProceedToSignup && onboardingSteps.length > 0 && (
          <Onboarding01
            steps={onboardingSteps}
            title="Create your parent account"
            onNextStep={(stepId) => {
              // This is called by Onboarding01's internal handleNextStep
              // We just need to ensure our currentStep state is in sync
              if (stepId === 'account') {
                setCurrentStep('personal')
              } else if (stepId === 'personal') {
                setCurrentStep('payment')
              }
            }}
          />
        )}

        <p className="text-xs text-center text-neutral-500">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-neutral-900 hover:underline">
            Sign in
          </a>
        </p>
        </div>
      </div>
    </div>
  )
}

export default function ParentSignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
        {/* Background image - same as auth page */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/auth-bg.png)'
          }}
        />
        
        {/* Content - centered with relative z-index */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center gap-6 p-6 md:p-10">
          <div className="flex w-[60vw] flex-col gap-6">
            <a href="/" className="flex items-center gap-2 self-center">
              <Image src="/logo.png" alt="Madrasah OS" width={128} height={32} className="h-8 w-auto" priority fetchPriority="high" />
            </a>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    }>
      <ParentSignupForm />
    </Suspense>
  )
}
