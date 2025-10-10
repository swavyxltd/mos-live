'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Lock, AlertCircle, X } from 'lucide-react'
import { StripePaymentMethodModal } from '@/components/stripe-payment-method'
import { toast } from 'sonner'

interface PaymentRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  action?: string
  userRole?: string
}

export function PaymentRequiredModal({ isOpen, onClose, action, userRole }: PaymentRequiredModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  if (!isOpen) return null

  const handlePaymentSuccess = (paymentMethodId: string) => {
    setShowPaymentModal(false)
    onClose()
    toast.success('Payment method added! You can now perform this action.')
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
  }

  const getActionDescription = () => {
    switch (action) {
      case 'add-student':
        return 'add students to your madrasah'
      case 'add-teacher':
        return 'add teachers to your madrasah'
      case 'create-class':
        return 'create classes for your students'
      case 'attendance':
        return 'track student attendance'
      case 'schedule':
        return 'schedule lessons'
      case 'reports':
        return 'generate reports'
      default:
        return 'perform this action'
    }
  }

  const getBlockedFeatures = () => {
    if (userRole === 'OWNER') {
      return [
        'Manage Organization',
        'Add Students',
        'Create Classes',
        'Add Teachers',
        'Platform Settings',
        'Billing Management'
      ]
    } else {
      return [
        'Add Students',
        'Create Classes',
        'Add Teachers',
        'Schedule Lessons',
        'Track Attendance',
        'Generate Reports'
      ]
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="w-full max-w-lg my-8">
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Payment Setup Required
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                You need to set up your payment method before you can {getActionDescription()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features Blocked */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Features Currently Unavailable</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      The following features are blocked until payment setup is complete:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {getBlockedFeatures().map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Set Up Payment Method
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="h-12 px-6"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Secure payment processing by Stripe. Your card details are encrypted and never stored on our servers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPaymentModal && (
        <StripePaymentMethodModal
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </>
  )
}
