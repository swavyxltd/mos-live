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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="w-full max-w-lg my-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Lock className="h-5 w-5 text-gray-700" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Payment Setup Required
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    You need to set up your payment method before you can {getActionDescription()}.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Features Blocked */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Features Currently Unavailable</h3>
                    <p className="text-xs text-gray-600 mb-3">
                      The following features are blocked until payment setup is complete:
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-8">
                  {getBlockedFeatures().map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full flex-shrink-0"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Set Up Payment Method
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Secure payment processing by Stripe. Your card details are encrypted and never stored on our servers.
              </p>
            </div>
          </div>
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
