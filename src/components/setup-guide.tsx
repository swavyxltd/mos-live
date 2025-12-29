'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, CreditCard, Users, GraduationCap, UserCheck, Link2, ArrowRight, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SetupStatus {
  paymentMethodsConfigured: boolean
  hasStaff: boolean
  hasClasses: boolean
  hasStudents: boolean
  signupLinkReady: boolean
  completionPercentage: number
  completedSteps: number
  totalSteps: number
  signupLink: string
  orgSlug: string
}

export function SetupGuide() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  // Initialize dismissed state - only dismiss if setup is complete AND user has dismissed
  const [dismissed, setDismissed] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const router = useRouter()

  // Check on mount if user has permanently dismissed (only after completion)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedPermanently = localStorage.getItem('setup-guide-dismissed')
      // Only respect dismissal if setup is actually complete
      if (dismissedPermanently === 'true' && setupStatus?.completionPercentage === 100) {
        setDismissed(true)
      }
    }
  }, [setupStatus?.completionPercentage])

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch('/api/dashboard/setup-status', {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        setSetupStatus(data)
      }
    } catch (error) {
      console.error('Error fetching setup status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSetupStatus()
    // Refresh every 5 seconds to check for updates (more frequent)
    const interval = setInterval(fetchSetupStatus, 5000)
    
    // Also refresh when window gains focus (user returns from settings page)
    const handleFocus = () => {
      fetchSetupStatus()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleCopyLink = async () => {
    if (!setupStatus?.signupLink) return
    
    try {
      await navigator.clipboard.writeText(setupStatus.signupLink)
      setCopiedLink(true)
      toast.success('Signup link copied to clipboard')
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleDismissPermanently = () => {
    // Mark as permanently dismissed in localStorage
    localStorage.setItem('setup-guide-dismissed', 'true')
    setDismissed(true)
    toast.success('Setup guide dismissed')
  }

  // Don't show if still loading or no status
  if (loading || !setupStatus) {
    return null
  }

  // Don't show if dismissed (only after completion) - check this after loading
  if (dismissed && setupStatus.completionPercentage === 100) {
    return null
  }

  // Show completion message when all steps are done
  // But only if not dismissed
  if (setupStatus.completionPercentage === 100) {
    return (
      <Card className="mb-6 border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-green-900">
                    You are ready to run your madrasah!
                  </CardTitle>
                  <p className="text-sm text-green-700 mt-1">
                    All setup steps are complete. Your madrasah is ready to go.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button
              onClick={handleDismissPermanently}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const setupSteps = [
    {
      id: 'payment',
      title: 'Choose payment methods for parents',
      description: 'Configure how parents can pay fees (card, cash, or bank transfer)',
      completed: setupStatus.paymentMethodsConfigured,
      icon: CreditCard,
      href: '/settings?tab=payment-methods',
      action: 'Configure Payment Methods'
    },
    {
      id: 'staff',
      title: 'Add staff',
      description: 'Add teachers and other staff members to your madrasah',
      completed: setupStatus.hasStaff,
      icon: UserCheck,
      href: '/staff',
      action: 'Add Staff'
    },
    {
      id: 'classes',
      title: 'Add classes',
      description: 'Create classes for your students',
      completed: setupStatus.hasClasses,
      icon: GraduationCap,
      href: '/classes',
      action: 'Add Class'
    },
    {
      id: 'students',
      title: 'Add students',
      description: 'Add students to your madrasah',
      completed: setupStatus.hasStudents,
      icon: Users,
      href: '/students',
      action: 'Add Student'
    },
    {
      id: 'signup',
      title: 'Share sign up link with parents',
      description: 'Send the parent signup link so parents can create accounts',
      completed: setupStatus.signupLinkReady,
      icon: Link2,
      href: null,
      action: 'Copy Link',
      isLink: true
    }
  ]

  return (
    <Card className="mb-6 border-2 border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Setup Guide</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Complete these steps to get your madrasah fully set up
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 transition-all duration-300"
                    style={{ width: `${setupStatus.completionPercentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 min-w-[60px] text-right">
                  {setupStatus.completedSteps} of {setupStatus.totalSteps}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Dismiss setup guide"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {setupSteps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = step.completed
            
            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <Circle className="h-4 w-4 text-white" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${
                          isCompleted ? 'text-green-600' : 'text-gray-600'
                        }`} />
                        <h3 className={`text-sm font-semibold ${
                          isCompleted ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </h3>
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                            Done
                          </Badge>
                        )}
                      </div>
                      <p className={`text-xs ${
                        isCompleted ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {!isCompleted && (
                      <div className="flex-shrink-0">
                        {step.isLink ? (
                          <Button
                            onClick={handleCopyLink}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            {copiedLink ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                {step.action}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => router.push(step.href || '#')}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            {step.action}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {setupStatus.signupLink && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 mb-1">Parent Signup Link</p>
                <p className="text-xs text-gray-600 break-all">{setupStatus.signupLink}</p>
              </div>
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

