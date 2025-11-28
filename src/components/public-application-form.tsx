'use client'

import { useState } from 'react'
import { PhoneLink } from './phone-link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { MadrasahLogo } from '@/components/madrasah-logo'
import { 
  Plus, 
  Minus, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Users,
  CheckCircle
} from 'lucide-react'

interface Org {
  id: string
  name: string
  slug: string
}

interface Class {
  id: string
  name: string
}

interface Child {
  firstName: string
  lastName: string
  dob: string
  gender: string
}

interface PublicApplicationFormProps {
  org: Org
  classes: Class[]
}

export function PublicApplicationForm({ org, classes }: PublicApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  // Guardian information
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianAddress, setGuardianAddress] = useState('')
  
  // Children information
  const [children, setChildren] = useState<Child[]>([
    { firstName: '', lastName: '', dob: '', gender: '' }
  ])
  
  // Preferences
  const [preferredClass, setPreferredClass] = useState('')
  const [preferredStartDate, setPreferredStartDate] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const addChild = () => {
    setChildren([...children, { firstName: '', lastName: '', dob: '', gender: '' }])
  }

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index))
    }
  }

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const updatedChildren = [...children]
    updatedChildren[index] = { ...updatedChildren[index], [field]: value }
    setChildren(updatedChildren)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!guardianName.trim()) {
      alert('Please enter the guardian\'s full name.')
      return
    }
    
    if (!guardianPhone.trim()) {
      alert('Please enter the guardian\'s phone number.')
      return
    }
    
    if (!guardianEmail.trim()) {
      alert('Please enter the guardian\'s email address.')
      return
    }
    
    if (!guardianAddress.trim()) {
      alert('Please enter the guardian\'s address.')
      return
    }
    
    // Validate children
    const validChildren = children.filter(child => child.firstName.trim() && child.lastName.trim())
    if (validChildren.length === 0) {
      alert('Please enter at least one child\'s information.')
      return
    }
    
    // Check if any child is missing required fields
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.firstName.trim() || child.lastName.trim()) {
        if (!child.firstName.trim()) {
          alert(`Please enter the first name for Child ${i + 1}.`)
          return
        }
        if (!child.lastName.trim()) {
          alert(`Please enter the last name for Child ${i + 1}.`)
          return
        }
        if (!child.dob.trim()) {
          alert(`Please enter the date of birth for Child ${i + 1}.`)
          return
        }
        if (!child.gender.trim()) {
          alert(`Please select the gender for Child ${i + 1}.`)
          return
        }
      }
    }
    
    if (!preferredClass.trim()) {
      alert('Please select a preferred class.')
      return
    }
    
    if (!preferredStartDate.trim()) {
      alert('Please enter a preferred start date.')
      return
    }
    
    if (!agreed) {
      alert('Please confirm that the information is accurate.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId: org.id,
          guardianName,
          guardianPhone,
          guardianEmail,
          guardianAddress: guardianAddress,
          children: children.filter(child => child.firstName && child.lastName),
          preferredClass: preferredClass || undefined,
          preferredStartDate: preferredStartDate || undefined,
          additionalNotes: additionalNotes || undefined,
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to submit application')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'There was an error submitting your application. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h1>
            <p className="text-gray-600">
              JazakAllahu khayran — your application has been received. We'll be in touch soon.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Thank you for your interest in {org.name}.</p>
            <p>We will review your application and contact you shortly.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center mb-6">
            <div className="scale-50 origin-center">
              <MadrasahLogo showText={false} size="lg-sm" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{org.name}</h1>
            <p className="text-lg text-gray-600 font-medium">Student Application Form</p>
            
            {/* Address at the top - normal text */}
            {((org as any).addressLine1 || (org as any).postcode || (org as any).city) && (
              <p className="mt-3 text-sm text-gray-600">
                {[
                  (org as any).addressLine1,
                  (org as any).city,
                  (org as any).postcode
                ].filter(Boolean).join(', ')}
              </p>
            )}
            
            {/* Public Contact Information */}
            {(org as any).publicPhone || (org as any).publicEmail ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
                  {(org as any).publicPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <PhoneLink phone={(org as any).publicPhone} />
                    </div>
                  )}
                  {(org as any).publicEmail && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{(org as any).publicEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guardian Information */}
          <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              Guardian Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Phone Number (WhatsApp) *
                </label>
                <Input
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  required
                  placeholder="Enter your phone number"
                  type="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Email Address *
                </label>
                <Input
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Address *
                </label>
                <Input
                  value={guardianAddress}
                  onChange={(e) => setGuardianAddress(e.target.value)}
                  required
                  placeholder="Enter your address"
                />
              </div>
            </div>
          </Card>

          {/* Children Information */}
          <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                Children Information
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChild}
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Child
              </Button>
            </div>
            
            <div className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">
                      Child {index + 1}
                    </h3>
                    {children.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <Input
                        value={child.firstName}
                        onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                        required
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <Input
                        value={child.lastName}
                        onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                        required
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <Input
                        value={child.dob}
                        onChange={(e) => updateChild(index, 'dob', e.target.value)}
                        type="date"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={child.gender === 'Male' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateChild(index, 'gender', 'Male')}
                          className="flex-1"
                        >
                          Male
                        </Button>
                        <Button
                          type="button"
                          variant={child.gender === 'Female' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateChild(index, 'gender', 'Female')}
                          className="flex-1"
                        >
                          Female
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              Preferences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Class/Program *
                </label>
                <Select
                  value={preferredClass}
                  onValueChange={setPreferredClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.name}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Start Date *
                </label>
                <Input
                  value={preferredStartDate}
                  onChange={(e) => setPreferredStartDate(e.target.value)}
                  type="date"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Agreement */}
          <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                className="mt-1"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  I confirm the information is accurate and I'm happy for the madrasah to contact me *
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  By checking this box, you confirm that all information provided is accurate and complete, and you consent to the madrasah contacting you regarding this application.
                </p>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-8">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !agreed}
              className="px-12 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Submit Application
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
