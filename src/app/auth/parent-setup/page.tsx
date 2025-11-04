'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Calendar, AlertCircle, CreditCard, DollarSign, TrendingUp, Loader2 } from 'lucide-react'

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
  org: {
    id: string
    name: string
  }
  paymentMethods: {
    cash: boolean
    bankTransfer: boolean
    stripe: boolean
  }
}

function ParentSetupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)

  // Form data
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [studentFirstName, setStudentFirstName] = useState('')
  const [studentLastName, setStudentLastName] = useState('')
  const [studentDob, setStudentDob] = useState('')
  const [studentAllergies, setStudentAllergies] = useState('')
  const [studentMedicalNotes, setStudentMedicalNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitationData()
  }, [token])

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
      setParentName('')
      setParentPhone('')
      setStudentFirstName(data.student.firstName)
      setStudentLastName(data.student.lastName)
      setStudentDob(data.student.dob ? new Date(data.student.dob).toISOString().split('T')[0] : '')
      setStudentAllergies(data.student.allergies || '')
      setStudentMedicalNotes(data.student.medicalNotes || '')
      setLoading(false)
    } catch (err) {
      setError('Failed to load invitation details')
      setLoading(false)
    }
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setStep(2)
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!parentName.trim()) {
      setError('Parent name is required')
      return
    }
    setError('')
    setStep(3)
  }

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentMethod) {
      setError('Please select a payment method')
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
          password,
          parentName,
          parentPhone,
          emergencyContact,
          studentFirstName,
          studentLastName,
          studentDob: studentDob || null,
          studentAllergies: studentAllergies || null,
          studentMedicalNotes: studentMedicalNotes || null,
          paymentMethod
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

  if (loading) {
    return (
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Madrasah OS" className="w-[198px] h-auto" />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </div>
    )
  }

  if (!invitationData) {
    return (
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Madrasah OS" className="w-[198px] h-auto" />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Invalid Invitation</h2>
            <p className="text-sm text-neutral-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const availableMethods = []
  if (invitationData.paymentMethods.cash) availableMethods.push({ value: 'CASH', label: 'Cash', icon: DollarSign })
  if (invitationData.paymentMethods.bankTransfer) availableMethods.push({ value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: TrendingUp })
  if (invitationData.paymentMethods.stripe) availableMethods.push({ value: 'STRIPE', label: 'Card Payment', icon: CreditCard })

  return (
    <div className="w-full max-w-[440px]">
      <div className="mb-6 flex justify-center">
        <img src="/logo.png" alt="Madrasah OS" className="w-[198px] h-auto" />
      </div>

      <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Welcome to {invitationData.org.name}
          </h1>
          <p className="text-sm text-neutral-600">
            Complete your account setup in 3 simple steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  step > s ? 'bg-neutral-900' : 'bg-neutral-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Create Password */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </form>
        )}

        {/* Step 2: Student & Parent Details */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Student Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={studentFirstName}
                    onChange={(e) => setStudentFirstName(e.target.value)}
                    required
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={studentLastName}
                    onChange={(e) => setStudentLastName(e.target.value)}
                    required
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="date"
                      value={studentDob}
                      onChange={(e) => setStudentDob(e.target.value)}
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Allergies (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentAllergies}
                    onChange={(e) => setStudentAllergies(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                    placeholder="e.g., Peanuts, Dairy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Medical Notes (Optional)
                  </label>
                  <textarea
                    value={studentMedicalNotes}
                    onChange={(e) => setStudentMedicalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                    placeholder="Any important medical information"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Parent Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Parent Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl border border-neutral-200/70 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                    placeholder="Name and phone number"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-11 border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Payment Method */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Choose Payment Method</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Monthly fee: £{invitationData.class.monthlyFee.toFixed(2)} for {invitationData.class.name}
              </p>
              <div className="space-y-3">
                {availableMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === method.value
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-neutral-600" />
                        <span className="font-medium text-neutral-900">{method.label}</span>
                        {paymentMethod === method.value && (
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
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-11 border border-neutral-200 text-neutral-700 font-medium rounded-xl hover:bg-neutral-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !paymentMethod}
                className="flex-1 h-11 bg-neutral-900 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ParentSetupPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Madrasah OS" className="w-[198px] h-auto" />
        </div>
        <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
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

