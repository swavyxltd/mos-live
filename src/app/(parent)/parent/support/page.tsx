'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { MapPin, Phone, Clock, AlertCircle } from 'lucide-react'
import { isDemoMode } from '@/lib/demo-mode'
import { PhoneLink } from '@/components/phone-link'

interface OrgContactInfo {
  name: string
  address: string
  phone: string
  email: string
  officeHours: string
}

export default function ParentSupportPage() {
  const { data: session, status } = useSession()
  const [contactInfo, setContactInfo] = useState<OrgContactInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo contact information
      setContactInfo({
        name: 'Leicester Islamic Centre',
        address: '123 High Street\nLeicester, LE1 1AA\nUnited Kingdom',
        phone: '+44 116 123 4567',
        email: 'info@leicesterislamiccentre.org',
        officeHours: 'Monday - Friday: 9:00 AM - 5:00 PM\nSaturday: 10:00 AM - 2:00 PM\nSunday: Closed'
      })
      setLoading(false)
    } else {
      // Fetch real contact information from organization settings
      fetch('/api/org/contact-info')
        .then(res => res.json())
        .then(data => {
          setContactInfo(data)
          setLoading(false)
        })
        .catch(err => {
          setLoading(false)
        })
    }
  }, [status])

  if (!session?.user?.id) {
    return null // Will be handled by auth redirect
  }

  if (loading) {
    return null // Will be handled by loading.tsx
  }

  if (!contactInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Support</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Get help with your children's education, payments, and school-related questions.
          </p>
        </div>
        <Card className="p-6">
          <div className="text-center text-[var(--muted-foreground)]">
            Contact information is being set up. Please check back soon.
          </div>
        </Card>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Support</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Get help with your children's education, payments, and school-related questions.
        </p>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <Card className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Contact Information</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Get in touch with us for any questions or support</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Address */}
            <div className="text-center">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Visit Us</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                {contactInfo.address.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="text-center">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Call Us</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                <p className="font-medium text-[var(--primary)]">
                  <PhoneLink phone={contactInfo.phone} />
                </p>
                <p className="text-sm">General inquiries</p>
              </div>
            </div>

            {/* Office Hours */}
            <div className="text-center">
              <div className="bg-orange-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Office Hours</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                {contactInfo.officeHours.split('\n').map((line, index) => (
                  <p key={index} className={line.toLowerCase().includes('closed') ? 'text-red-600' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Technical Support */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Technical Support</h3>
          <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">App Issues</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      For technical problems with the Madrasah OS app, please contact:
                    </p>
                    <a 
                      href="mailto:support@madrasah.io?subject=Madrasah OS App Support Request"
                      className="text-sm font-medium text-[var(--primary)] mt-1 hover:underline"
                    >
                      support@madrasah.io
                    </a>
                  </div>
                </div>
          </div>
        </Card>
      </div>
    </div>
  )
}