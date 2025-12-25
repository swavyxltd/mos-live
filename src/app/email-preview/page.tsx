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
    id: 'application-rejection',
    name: 'Application Rejection',
    description: 'Sent automatically when admin rejects an application',
    type: 'application-rejection',
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
    id: 'payment-link',
    name: 'Payment Link',
    description: 'Sent automatically when a payment link is generated for an invoice',
    type: 'payment-link',
    category: 'automatic'
  },
  {
    id: 'billing-success',
    name: 'Billing Success',
    description: 'Sent automatically when platform subscription payment succeeds',
    type: 'billing-success',
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
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile')

  const loadEmail = async (type: string) => {
    setLoading(true)
    setSelectedEmail(type)
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const response = await fetch(`/api/email-preview?type=${type}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
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
                <div className="p-4">
                  {/* View Mode Toggle */}
                  <div className="mb-4 flex justify-center">
                    <div className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-1">
                      <button
                        onClick={() => setViewMode('mobile')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'mobile'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        📱 Mobile
                      </button>
                      <button
                        onClick={() => setViewMode('desktop')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'desktop'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        💻 Desktop
                      </button>
                    </div>
                  </div>

                  {/* Mobile Preview */}
                  {viewMode === 'mobile' ? (
                    <div className="flex justify-center">
                      <div className="relative" style={{ width: '375px', maxWidth: '100%' }}>
                        {/* Device Frame */}
                        <div className="bg-black rounded-[2.5rem] p-2 shadow-2xl">
                          <div className="bg-white rounded-[2rem] overflow-hidden">
                            {/* Status Bar */}
                            <div className="bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs text-gray-900">
                              <span>9:41</span>
                              <div className="flex gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                </svg>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.076 13.308-5.076 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm14 12V6H4v10h12z" />
                                </svg>
                              </div>
                            </div>
                            {/* Email Content */}
                            <div className="bg-gray-50" style={{ height: '667px', overflow: 'auto' }}>
                              <iframe
                                srcDoc={emailHtml.replace(
                                  '</head>',
                                  `<style>
                                    * {
                                      -webkit-user-select: text !important;
                                      -moz-user-select: text !important;
                                      -ms-user-select: text !important;
                                      user-select: text !important;
                                      -webkit-touch-callout: default !important;
                                    }
                                    body {
                                      -webkit-user-select: text !important;
                                      -moz-user-select: text !important;
                                      -ms-user-select: text !important;
                                      user-select: text !important;
                                      margin: 0 !important;
                                      padding: 0 !important;
                                    }
                                    table[width="100%"] {
                                      max-width: 375px !important;
                                    }
                                  </style></head>`
                                )}
                                className="w-full h-full border-0"
                                title="Email Preview"
                                sandbox="allow-same-origin allow-scripts"
                                style={{ userSelect: 'text', width: '375px', height: '667px' }}
                              />
                            </div>
                            {/* Home Indicator */}
                            <div className="bg-white pb-2">
                              <div className="w-32 h-1 bg-gray-400 rounded-full mx-auto"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Desktop Preview */
                    <div className="w-full" style={{ minHeight: '800px' }}>
                      <iframe
                        srcDoc={emailHtml.replace(
                          '</head>',
                          `<style>
                            * {
                              -webkit-user-select: text !important;
                              -moz-user-select: text !important;
                              -ms-user-select: text !important;
                              user-select: text !important;
                              -webkit-touch-callout: default !important;
                            }
                            body {
                              -webkit-user-select: text !important;
                              -moz-user-select: text !important;
                              -ms-user-select: text !important;
                              user-select: text !important;
                            }
                          </style></head>`
                        )}
                        className="w-full border-0 rounded-lg"
                        title="Email Preview"
                        sandbox="allow-same-origin allow-scripts"
                        style={{ userSelect: 'text', minHeight: '800px' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

