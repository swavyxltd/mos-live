'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  User, 
  Building2, 
  CreditCard, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Globe,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { isValidPhone, isValidUKPostcode } from '@/lib/input-validation'

type Step = 'admin' | 'organisation' | 'payments' | 'review'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState<Step>('admin')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [adminPhoneError, setAdminPhoneError] = useState('')
  const [orgPhoneError, setOrgPhoneError] = useState('')
  const [orgPublicPhoneError, setOrgPublicPhoneError] = useState('')
  const [orgPostcodeError, setOrgPostcodeError] = useState('')

  // Form data
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const [orgData, setOrgData] = useState({
    addressLine1: '',
    address: '',
    city: '',
    postcode: '',
    phone: '',
    publicPhone: '',
    email: '',
    publicEmail: '',
    officeHours: ''
  })

  const [paymentData, setPaymentData] = useState({
    acceptsCard: false,
    acceptsCash: true,
    acceptsBankTransfer: true,
    billingDay: null as any,
    bankAccountName: '',
    bankSortCode: '',
    bankAccountNumber: '',
    paymentInstructions: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    fetchProgress()
  }, [status, router])

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/onboarding')
      if (response.ok) {
        const data = await response.json()
        setProgress(data)
        
        // Pre-fill form data
        if (data.user) {
          setAdminData({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || ''
          })
        }
        
        if (data.organisation) {
          setOrgData({
            addressLine1: data.organisation.addressLine1 || '',
            address: data.organisation.address || '',
            city: data.organisation.city || '',
            postcode: data.organisation.postcode || '',
            phone: data.organisation.phone || '',
            publicPhone: data.organisation.publicPhone || '',
            email: data.organisation.email || '',
            publicEmail: data.organisation.publicEmail || '',
            officeHours: data.organisation.officeHours || ''
          })
          
          setPaymentData({
            acceptsCard: data.organisation.acceptsCard ?? false,
            acceptsCash: data.organisation.acceptsCash ?? true,
            acceptsBankTransfer: data.organisation.acceptsBankTransfer ?? true,
            billingDay: data.organisation.billingDay ?? null,
            bankAccountName: data.organisation.bankAccountName || '',
            bankSortCode: data.organisation.bankSortCode || '',
            bankAccountNumber: data.organisation.bankAccountNumber || '',
            paymentInstructions: data.organisation.paymentInstructions || ''
          })
        }

        // Determine current step
        if (!data.steps.admin) {
          setCurrentStep('admin')
        } else if (!data.steps.organisation) {
          setCurrentStep('organisation')
        } else if (!data.steps.payments) {
          setCurrentStep('payments')
        } else {
          setCurrentStep('review')
        }
      }
    } catch (error) {
      toast.error('Failed to load onboarding progress')
    } finally {
      setLoading(false)
    }
  }

  const saveStep = async (step: Step, data: any) => {
    setSaving(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save step')
      }

      toast.success('Progress saved')
      return true
    } catch (error: any) {
      toast.error(error.message || 'Failed to save step')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    let isValid = true
    let dataToSave: any = {}

    switch (currentStep) {
      case 'admin':
        // Import validation functions
        const { isValidName, isValidEmailStrict } = await import('@/lib/input-validation')
        
        if (!adminData.name || !adminData.email) {
          toast.error('Please fill in all required fields')
          return
        }
        
        // Validate name - split into first and last name
        const nameParts = adminData.name.trim().split(/\s+/)
        if (nameParts.length < 2) {
          toast.error('Please enter both first and last name')
          return
        }
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ')
        if (!isValidName(firstName) || !isValidName(lastName)) {
          toast.error('Name must be a valid name (2-50 characters per name, letters only)')
          return
        }

        // Validate email
        if (!isValidEmailStrict(adminData.email)) {
          toast.error('Please enter a valid email address')
          return
        }
        
        dataToSave = adminData
        break

      case 'organisation':
        // Import validation functions
        const { isValidAddressLine, isValidCity, isValidEmailStrict: isValidEmailStrictOrg, isValidPhone: isValidPhoneOrg, isValidUKPostcode: isValidUKPostcodeOrg } = await import('@/lib/input-validation')
        
        if (!orgData.addressLine1 || !orgData.city || !orgData.postcode || 
            !orgData.phone || !orgData.publicPhone || !orgData.email || !orgData.publicEmail) {
          toast.error('Please fill in all required organisation fields')
          return
        }
        
        // Validate address line 1
        if (!isValidAddressLine(orgData.addressLine1)) {
          toast.error('Address must be a valid address (5-100 characters)')
          return
        }

        // Validate city
        if (!isValidCity(orgData.city)) {
          toast.error('City must be a valid city name (2-50 characters, letters only)')
          return
        }

        // Validate postcode
        if (!isValidUKPostcodeOrg(orgData.postcode)) {
          toast.error('Please enter a valid UK postcode')
          return
        }
        
        // Validate phone
        if (!isValidPhoneOrg(orgData.phone)) {
          toast.error('Please enter a valid UK phone number for Contact Phone')
          return
        }
        
        // Validate public phone
        if (!isValidPhoneOrg(orgData.publicPhone)) {
          toast.error('Please enter a valid UK phone number for Public Phone')
          return
        }

        // Validate email
        if (!isValidEmailStrictOrg(orgData.email)) {
          toast.error('Please enter a valid email address for Contact Email')
          return
        }

        // Validate public email
        if (!isValidEmailStrictOrg(orgData.publicEmail)) {
          toast.error('Please enter a valid email address for Public Email')
          return
        }
        
        dataToSave = orgData
        break

      case 'payments':
        if (!paymentData.acceptsCard && !paymentData.acceptsCash && !paymentData.acceptsBankTransfer) {
          toast.error('Please enable at least one payment method')
          return
        }
        if (paymentData.billingDay !== null && (paymentData.billingDay < 1 || paymentData.billingDay > 28)) {
          toast.error('Billing day must be between 1 and 28, or leave empty')
          return
        }
        dataToSave = paymentData
        break
    }

    const saved = await saveStep(currentStep, dataToSave)
    if (!saved) return

    // Move to next step
    const steps: Step[] = ['admin', 'organisation', 'payments', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: Step[] = ['admin', 'organisation', 'payments', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'complete', data: {} })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete onboarding')
      }

      toast.success('Onboarding completed!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding')
    } finally {
      setSaving(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const steps: Step[] = ['admin', 'organisation', 'payments', 'review']
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      index <= currentStepIndex
                        ? 'bg-gray-600 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-600 capitalize">
                    {step === 'admin' ? 'Admin' : step === 'organisation' ? 'Organisation' : step === 'payments' ? 'Payments' : 'Review'}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      index < currentStepIndex ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'admin' && 'Admin Account Details'}
              {currentStep === 'organisation' && 'Organisation Information'}
              {currentStep === 'payments' && 'Payment Methods Setup'}
              {currentStep === 'review' && 'Review & Complete'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'admin' && 'Tell us about yourself'}
              {currentStep === 'organisation' && 'Enter your organisation details'}
              {currentStep === 'payments' && 'Configure payment methods for parents'}
              {currentStep === 'review' && 'Review your information before completing'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Admin Details */}
            {currentStep === 'admin' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={adminData.name}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length > 0) {
                        setAdminData({ ...adminData, name: value.charAt(0).toUpperCase() + value.slice(1) })
                      } else {
                        setAdminData({ ...adminData, name: value })
                      }
                    }}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={adminData.phone}
                    onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                    className={adminPhoneError ? 'border-red-500' : adminData.phone && isValidPhone(adminData.phone) ? 'border-green-500' : ''}
                    placeholder="+44 20 1234 5678"
                  />
                  {adminPhoneError && (
                    <p className="text-xs text-red-600 mt-1">{adminPhoneError}</p>
                  )}
                  {adminData.phone && !adminPhoneError && isValidPhone(adminData.phone) && (
                    <p className="text-xs text-green-600 mt-1">Valid UK phone number</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Organisation Details */}
            {currentStep === 'organisation' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={orgData.addressLine1}
                    onChange={(e) => {
                      const value = e.target.value
                      // Capitalize first letter of each word for address line 1
                      const capitalized = value.split(' ').map(word => {
                        if (word.length === 0) return word
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      }).join(' ')
                      setOrgData({ ...orgData, addressLine1: capitalized })
                    }}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address Line 2</Label>
                  <Input
                    id="address"
                    value={orgData.address}
                    onChange={(e) => {
                      const value = e.target.value
                      // Capitalize first letter of each word for address line 2
                      const capitalized = value.split(' ').map(word => {
                        if (word.length === 0) return word
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      }).join(' ')
                      setOrgData({ ...orgData, address: capitalized })
                    }}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={orgData.city}
                      onChange={(e) => {
                        const value = e.target.value
                        // Capitalize first letter of each word for city
                        const capitalized = value.split(' ').map(word => {
                          if (word.length === 0) return word
                          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        }).join(' ')
                        setOrgData({ ...orgData, city: capitalized })
                      }}
                      placeholder="London"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input
                      id="postcode"
                      value={orgData.postcode}
                      onChange={(e) => {
                        // Postcode should be full caps
                        setOrgData({ ...orgData, postcode: e.target.value.toUpperCase() })
                      }}
                      className={orgPostcodeError ? 'border-red-500' : orgData.postcode && isValidUKPostcode(orgData.postcode) ? 'border-green-500' : ''}
                      placeholder="SW1A 1AA"
                      required
                    />
                    {orgPostcodeError && (
                      <p className="text-xs text-red-600 mt-1">{orgPostcodeError}</p>
                    )}
                    {orgData.postcode && !orgPostcodeError && isValidUKPostcode(orgData.postcode) && (
                      <p className="text-xs text-green-600 mt-1">Valid UK postcode</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Contact Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={orgData.phone}
                      onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                      className={orgPhoneError ? 'border-red-500' : orgData.phone && isValidPhone(orgData.phone) ? 'border-green-500' : ''}
                      placeholder="+44 20 1234 5678"
                      required
                    />
                    {orgPhoneError && (
                      <p className="text-xs text-red-600 mt-1">{orgPhoneError}</p>
                    )}
                    {orgData.phone && !orgPhoneError && isValidPhone(orgData.phone) && (
                      <p className="text-xs text-green-600 mt-1">Valid UK phone number</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="publicPhone">Public Phone *</Label>
                    <Input
                      id="publicPhone"
                      type="tel"
                      value={orgData.publicPhone}
                      onChange={(e) => setOrgData({ ...orgData, publicPhone: e.target.value })}
                      className={orgPublicPhoneError ? 'border-red-500' : orgData.publicPhone && isValidPhone(orgData.publicPhone) ? 'border-green-500' : ''}
                      placeholder="+44 20 1234 5678"
                      required
                    />
                    {orgPublicPhoneError && (
                      <p className="text-xs text-red-600 mt-1">{orgPublicPhoneError}</p>
                    )}
                    {orgData.publicPhone && !orgPublicPhoneError && isValidPhone(orgData.publicPhone) && (
                      <p className="text-xs text-green-600 mt-1">Valid UK phone number</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Contact Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                      placeholder="contact@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="publicEmail">Public Email *</Label>
                    <Input
                      id="publicEmail"
                      type="email"
                      value={orgData.publicEmail}
                      onChange={(e) => setOrgData({ ...orgData, publicEmail: e.target.value })}
                      placeholder="info@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="officeHours">Office Hours</Label>
                  <Input
                    id="officeHours"
                    value={orgData.officeHours}
                    onChange={(e) => setOrgData({ ...orgData, officeHours: e.target.value })}
                    placeholder="Mon-Fri: 9am-5pm"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Payment Methods */}
            {currentStep === 'payments' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Card Payments (Automatic)</Label>
                      <p className="text-sm text-gray-500">Requires Stripe Connect setup</p>
                    </div>
                    <Switch
                      checked={paymentData.acceptsCard}
                      onCheckedChange={(checked) => setPaymentData({ ...paymentData, acceptsCard: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Cash Payments</Label>
                      <p className="text-sm text-gray-500">Parents pay in cash at office</p>
                    </div>
                    <Switch
                      checked={paymentData.acceptsCash}
                      onCheckedChange={(checked) => setPaymentData({ ...paymentData, acceptsCash: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Bank Transfer</Label>
                      <p className="text-sm text-gray-500">Direct bank transfers</p>
                    </div>
                    <Switch
                      checked={paymentData.acceptsBankTransfer}
                      onCheckedChange={(checked) => setPaymentData({ ...paymentData, acceptsBankTransfer: checked })}
                    />
                  </div>
                </div>

                {paymentData.acceptsBankTransfer && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-medium">Bank Transfer Details</h3>
                    <div>
                      <Label htmlFor="bankAccountName">Account Name</Label>
                      <Input
                        id="bankAccountName"
                        value={paymentData.bankAccountName}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.length > 0) {
                            setPaymentData({ ...paymentData, bankAccountName: value.charAt(0).toUpperCase() + value.slice(1) })
                          } else {
                            setPaymentData({ ...paymentData, bankAccountName: value })
                          }
                        }}
                        placeholder="Organisation Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bankSortCode">Sort Code</Label>
                        <Input
                          id="bankSortCode"
                          value={paymentData.bankSortCode}
                          onChange={(e) => setPaymentData({ ...paymentData, bankSortCode: e.target.value })}
                          placeholder="12-34-56"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bankAccountNumber">Account Number</Label>
                        <Input
                          id="bankAccountNumber"
                          value={paymentData.bankAccountNumber}
                          onChange={(e) => setPaymentData({ ...paymentData, bankAccountNumber: e.target.value })}
                          placeholder="12345678"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="billingDay">Billing Day (1-28) *</Label>
                  <Input
                    id="billingDay"
                    type="number"
                    min="1"
                    max="28"
                    value={paymentData.billingDay}
                    onChange={(e) => setPaymentData({ ...paymentData, billingDay: e.target.value === '' ? null : parseInt(e.target.value) || null })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Day of month when automatic payments are charged</p>
                </div>

                <div>
                  <Label htmlFor="paymentInstructions">Payment Instructions</Label>
                  <Textarea
                    id="paymentInstructions"
                    value={paymentData.paymentInstructions}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentInstructions: e.target.value })}
                    placeholder="Additional instructions for parents..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && progress && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Admin Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {adminData.name}</p>
                    <p><strong>Email:</strong> {adminData.email}</p>
                    {adminData.phone && <p><strong>Phone:</strong> {adminData.phone}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-4">Organisation Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {orgData.addressLine1}, {orgData.city}, {orgData.postcode}</p>
                    <p><strong>Contact Phone:</strong> {orgData.phone}</p>
                    <p><strong>Public Phone:</strong> {orgData.publicPhone}</p>
                    <p><strong>Contact Email:</strong> {orgData.email}</p>
                    <p><strong>Public Email:</strong> {orgData.publicEmail}</p>
                    {orgData.officeHours && <p><strong>Office Hours:</strong> {orgData.officeHours}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-4">Payment Methods</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Card Payments:</strong> {paymentData.acceptsCard ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Cash Payments:</strong> {paymentData.acceptsCash ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Bank Transfer:</strong> {paymentData.acceptsBankTransfer ? 'Enabled' : 'Disabled'}</p>
                    <p><strong>Billing Day:</strong> {paymentData.billingDay ?? 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0 || saving}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {currentStep === 'review' ? (
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

