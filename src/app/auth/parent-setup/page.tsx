'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Calendar, AlertCircle, CreditCard, Coins, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
      // Pre-fill parent info if available
      setParentName(data.parent?.name || '')
      setParentPhone(data.parent?.phone || '')
      // Pre-fill student info
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
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <img src="/madrasah-logo.png" alt="Madrasah OS" className="h-8 w-auto" />
          </a>
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!invitationData) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <img src="/madrasah-logo.png" alt="Madrasah OS" className="h-8 w-auto" />
          </a>
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">Invalid Invitation</h2>
              <p className="text-sm text-neutral-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const availableMethods = []
  if (invitationData.paymentMethods.cash) availableMethods.push({ value: 'CASH', label: 'Cash', icon: Coins })
  if (invitationData.paymentMethods.bankTransfer) availableMethods.push({ value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: TrendingUp })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* Logo/Branding */}
        <a href="/" className="flex items-center gap-2 self-center">
          <img src="/logo.png" alt="Madrasah OS" className="h-8 w-auto" />
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome to {invitationData.org.name}</CardTitle>
            <CardDescription>
              Complete your account setup in 3 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            {/* Step 1: Create Password */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Create Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10"
                        placeholder="At least 8 characters"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-10"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 2: Student & Parent Details */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit}>
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Student Information</h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentFirstName">First Name</Label>
                        <Input
                          id="studentFirstName"
                          type="text"
                          value={studentFirstName}
                          onChange={(e) => setStudentFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentLastName">Last Name</Label>
                        <Input
                          id="studentLastName"
                          type="text"
                          value={studentLastName}
                          onChange={(e) => setStudentLastName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentDob">Date of Birth</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                          <Input
                            id="studentDob"
                            type="date"
                            value={studentDob}
                            onChange={(e) => setStudentDob(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentAllergies">Allergies (Optional)</Label>
                        <Input
                          id="studentAllergies"
                          type="text"
                          value={studentAllergies}
                          onChange={(e) => setStudentAllergies(e.target.value)}
                          placeholder="e.g., Peanuts, Dairy"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="studentMedicalNotes">Medical Notes (Optional)</Label>
                        <textarea
                          id="studentMedicalNotes"
                          value={studentMedicalNotes}
                          onChange={(e) => setStudentMedicalNotes(e.target.value)}
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Any important medical information"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-200">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Parent Information</h3>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="parentName">Parent Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                          <Input
                            id="parentName"
                            type="text"
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                            required
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="parentPhone">Phone Number (Optional)</Label>
                        <Input
                          id="parentPhone"
                          type="tel"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                        <Input
                          id="emergencyContact"
                          type="text"
                          value={emergencyContact}
                          onChange={(e) => setEmergencyContact(e.target.value)}
                          placeholder="Name and phone number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1">
                      Continue
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 3: Payment Method */}
            {step === 3 && (
              <form onSubmit={handleStep3Submit}>
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Choose Payment Method</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Monthly fee: £{invitationData.class.monthlyFee.toFixed(2)} for {invitationData.class.name}
                    </p>
                    <div className="flex flex-col gap-3">
                      {availableMethods.map((method) => {
                        const Icon = method.icon
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setPaymentMethod(method.value)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              paymentMethod === method.value
                                ? 'border-neutral-900 bg-neutral-50'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-neutral-500" strokeWidth={method.value === 'CASH' ? 1.5 : undefined} />
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

                    {/* Bank Transfer Details */}
                    {paymentMethod === 'BANK_TRANSFER' && invitationData.bankDetails && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-3">Bank Transfer Details</h4>
                        {invitationData.bankDetails.accountName && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-blue-800">Account Name:</span>
                            <span className="text-sm text-blue-900 ml-2">{invitationData.bankDetails.accountName}</span>
                          </div>
                        )}
                        {invitationData.bankDetails.sortCode && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-blue-800">Sort Code:</span>
                            <span className="text-sm text-blue-900 ml-2">{invitationData.bankDetails.sortCode}</span>
                          </div>
                        )}
                        {invitationData.bankDetails.accountNumber && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-blue-800">Account Number:</span>
                            <span className="text-sm text-blue-900 ml-2">{invitationData.bankDetails.accountNumber}</span>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <p className="text-xs font-medium text-blue-900 mb-1">Setting up a Standing Order:</p>
                          <p className="text-xs text-blue-700">
                            You can set up a standing order with your bank using these details to automatically pay your monthly fees. 
                            Contact your bank to set this up, and payments will be made automatically each month.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !paymentMethod}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                          Completing...
                        </>
                      ) : (
                        'Complete Setup'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ParentSetupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="/" className="flex items-center gap-2 self-center">
            <img src="/madrasah-logo.png" alt="Madrasah OS" className="h-8 w-auto" />
          </a>
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ParentSetupForm />
    </Suspense>
  )
}

