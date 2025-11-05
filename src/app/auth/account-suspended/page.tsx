'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Mail, Phone, CreditCard } from 'lucide-react'
import { PlatformOverduePaymentModal } from '@/components/platform-overdue-payment-modal'

export default function AccountSuspendedPage() {
  const searchParams = useSearchParams()
  const orgName = searchParams.get('org') || 'your organisation'
  const reason = searchParams.get('reason') || 'No reason provided'
  const orgId = searchParams.get('orgId')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handlePayNow = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    // Redirect to dashboard after successful payment
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-900">Account Suspended</CardTitle>
            <CardDescription className="text-red-700 text-sm">
              Your organisation account has been suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">
                <strong>{orgName}</strong> account has been suspended.
              </p>
              <p className="text-xs text-gray-500">
                {reason}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h3 className="font-medium text-yellow-800 mb-1.5 text-sm">What does this mean?</h3>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                <li>• All admin, staff, and teacher accounts are locked</li>
                <li>• You cannot access the organisation dashboard</li>
                <li>• Students and parents can still access their accounts</li>
                <li>• Contact support to resolve the issue</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-900 text-sm">Need help?</h3>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Mail className="h-3.5 w-3.5" />
                  <span>support@madrasah.io</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+44 20 1234 5678</span>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handlePayNow}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/auth/signin'}
              >
                Return to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlatformOverduePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        orgId={orgId || undefined}
      />
    </div>
  )
}
