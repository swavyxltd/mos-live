'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface EmailPreview {
  id: string
  name: string
  description: string
  type: string
  category: 'automatic' | 'manual'
}

const emailTypes: EmailPreview[] = [
  {
    id: 'application-submission',
    name: 'Application Submission Confirmation',
    description: 'Sent automatically when a parent submits an application',
    type: 'application-submission',
    category: 'automatic'
  },
  {
    id: 'application-acceptance',
    name: 'Application Acceptance',
    description: 'Sent automatically when admin accepts an application',
    type: 'application-acceptance',
    category: 'automatic'
  },
  {
    id: 'payment-confirmation',
    name: 'Payment Confirmation',
    description: 'Sent automatically when admin marks a payment as paid',
    type: 'payment-confirmation',
    category: 'automatic'
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    description: 'Sent automatically when user requests password reset',
    type: 'password-reset',
    category: 'automatic'
  },
  {
    id: 'two-factor-code',
    name: '2FA Verification Code',
    description: 'Sent automatically during login if 2FA is enabled',
    type: 'two-factor-code',
    category: 'automatic'
  },
  {
    id: 'parent-invite',
    name: 'Parent Invite',
    description: 'Sent manually when admin invites a parent to set up account',
    type: 'parent-invite',
    category: 'manual'
  },
  {
    id: 'parent-onboarding',
    name: 'Parent Onboarding',
    description: 'Sent automatically when student is created with invite',
    type: 'parent-onboarding',
    category: 'manual'
  },
  {
    id: 'staff-invitation',
    name: 'Staff Invitation',
    description: 'Sent manually when admin creates a staff member with invitation',
    type: 'staff-invitation',
    category: 'manual'
  },
  {
    id: 'message-announcement',
    name: 'Message/Announcement',
    description: 'Sent manually when admin sends message via EMAIL channel',
    type: 'message-announcement',
    category: 'manual'
  },
  {
    id: 'gift-aid-reminder',
    name: 'Gift Aid Reminder',
    description: 'Sent manually when admin sends Gift Aid reminders',
    type: 'gift-aid-reminder',
    category: 'manual'
  },
  {
    id: 'meeting-scheduled',
    name: 'Meeting Scheduled',
    description: 'Sent automatically when admin creates a MEETING event',
    type: 'meeting-scheduled',
    category: 'manual'
  },
  {
    id: 'org-setup-invitation',
    name: 'Organisation Setup Invitation',
    description: 'Sent automatically when owner creates a new organisation',
    type: 'org-setup-invitation',
    category: 'automatic'
  },
  {
    id: 'org-setup-confirmation',
    name: 'Organisation Setup Confirmation',
    description: 'Sent automatically when organisation setup is complete',
    type: 'org-setup-confirmation',
    category: 'automatic'
  },
  {
    id: 'payment-failed-platform',
    name: 'Platform Payment Failed',
    description: 'Sent automatically when Stripe payment fails (webhook)',
    type: 'payment-failed-platform',
    category: 'automatic'
  },
  {
    id: 'payment-failed-warning',
    name: 'Platform Payment Warning',
    description: 'Sent automatically after 3 failed payment retry attempts',
    type: 'payment-failed-warning',
    category: 'automatic'
  },
  {
    id: 'support-notification',
    name: 'Support Ticket Notification',
    description: 'Sent automatically when owner responds to support ticket',
    type: 'support-notification',
    category: 'automatic'
  },
  {
    id: 'lead-initial-outreach',
    name: 'Lead Initial Outreach',
    description: 'Sent manually when owner sends initial outreach email to a lead',
    type: 'lead-initial-outreach',
    category: 'manual'
  },
  {
    id: 'lead-follow-up-1',
    name: 'Lead Follow-up Email',
    description: 'Sent manually when owner sends first follow-up email to a lead',
    type: 'lead-follow-up-1',
    category: 'manual'
  },
  {
    id: 'lead-follow-up-2',
    name: 'Lead Second Follow-up',
    description: 'Sent manually when owner sends second follow-up email to a lead',
    type: 'lead-follow-up-2',
    category: 'manual'
  },
  {
    id: 'lead-final-follow-up',
    name: 'Lead Final Follow-up',
    description: 'Sent manually when owner sends final follow-up email to a lead',
    type: 'lead-final-follow-up',
    category: 'manual'
  }
]

export default function EmailPreviewPage() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [emailHtml, setEmailHtml] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const loadEmail = async (type: string) => {
    setLoading(true)
    setSelectedEmail(type)
    try {
      const response = await fetch(`/api/email-preview?type=${type}`)
      if (response.ok) {
        const html = await response.text()
        setEmailHtml(html)
      } else {
        setEmailHtml('<p>Error loading email preview</p>')
      }
    } catch (error) {
      console.error('Error loading email:', error)
      setEmailHtml('<p>Error loading email preview</p>')
    } finally {
      setLoading(false)
    }
  }

  const automaticEmails = emailTypes.filter(e => e.category === 'automatic')
  const manualEmails = emailTypes.filter(e => e.category === 'manual')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Preview</h1>
          <p className="text-gray-600">Review all automatic and manual emails with demo data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h2>
              
              {/* Automatic Emails */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Automatic ({automaticEmails.length})
                </h3>
                <div className="space-y-2">
                  {automaticEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => loadEmail(email.type)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedEmail === email.type
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="font-medium">{email.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{email.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Emails */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Manual ({manualEmails.length})
                </h3>
                <div className="space-y-2">
                  {manualEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => loadEmail(email.type)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedEmail === email.type
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="font-medium">{email.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{email.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {!selectedEmail ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">Select an email template to preview</p>
                </div>
              ) : loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading email preview...</p>
                </div>
              ) : (
                <div className="w-full h-screen" style={{ minHeight: '800px' }}>
                  <iframe
                    srcDoc={emailHtml}
                    className="w-full h-full border-0"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

