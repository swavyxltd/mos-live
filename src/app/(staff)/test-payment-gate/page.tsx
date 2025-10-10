'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RestrictedAction } from '@/components/restricted-action'
import { DemoRestrictedActions } from '@/components/demo-restricted-actions'
import { PaymentTestUtils } from '@/components/payment-test-utils'
import { PaymentRequiredModal } from '@/components/payment-required-modal'
import { usePaymentGate } from '@/hooks/use-payment-gate'
import { PaymentGateContext } from '@/contexts/payment-gate-context'
import { useContext, useState } from 'react'
import { Plus, Users, GraduationCap, Calendar, BarChart3, Settings, CreditCard } from 'lucide-react'

export default function TestPaymentGatePage() {
  const context = useContext(PaymentGateContext)
  const { checkAction, paymentStatus, loading, showModal } = usePaymentGate()
  const [testModalOpen, setTestModalOpen] = useState(false)

  const handleDirectTest = () => {
    console.log('Direct test button clicked')
    const canProceed = checkAction('direct-test')
    console.log('Direct test - can proceed:', canProceed)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Gate Test Page</h1>
        <p className="text-gray-600 mt-2">
          Test the payment gate system by clicking the buttons below. If payment is not set up, you'll see a modal.
        </p>
        
        {/* Debug Info */}
        <div className="bg-gray-100 p-4 rounded-lg mt-4">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Payment Status: {paymentStatus ? JSON.stringify(paymentStatus) : 'null'}</p>
          <p>Show Modal: {showModal ? 'Yes' : 'No'}</p>
          <p>Context Show Modal: {context?.showModal ? 'Yes' : 'No'}</p>
          <p>Context Blocked Action: {context?.blockedAction || 'None'}</p>
        </div>
        
        {/* Direct Test Button */}
        <div className="mt-4 flex gap-3">
          <Button onClick={handleDirectTest} variant="outline">
            Direct Test (No Wrapper)
          </Button>
          <Button onClick={() => setTestModalOpen(true)} variant="outline">
            Open Test Modal
          </Button>
        </div>
        
        {/* Test Modal Directly - Force Open */}
        <div className="mt-4">
          <PaymentRequiredModal
            isOpen={testModalOpen}
            onClose={() => setTestModalOpen(false)}
            action="add-student"
            userRole="TEACHER"
          />
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario 1: No Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Scenario 1: No Payment Method
            </CardTitle>
            <CardDescription>
              These buttons should show the payment required modal when clicked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RestrictedAction action="add-student">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </RestrictedAction>
            
            <RestrictedAction action="add-teacher">
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </RestrictedAction>
            
            <RestrictedAction action="create-class">
              <Button className="w-full">
                <GraduationCap className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </RestrictedAction>
          </CardContent>
        </Card>

        {/* Scenario 2: Different Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Scenario 2: Various Actions
            </CardTitle>
            <CardDescription>
              Test different types of restricted actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RestrictedAction action="attendance">
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Track Attendance
              </Button>
            </RestrictedAction>
            
            <RestrictedAction action="reports">
              <Button className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
            </RestrictedAction>
            
            <RestrictedAction action="schedule">
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Lessons
              </Button>
            </RestrictedAction>
          </CardContent>
        </Card>
      </div>

      {/* Demo Component */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Component</CardTitle>
          <CardDescription>
            This component demonstrates how to use the RestrictedAction wrapper.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DemoRestrictedActions />
        </CardContent>
      </Card>

      {/* Test Utilities */}
      <PaymentTestUtils />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Test Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Click any of the buttons above</li>
              <li>If payment is not set up, you should see a modal</li>
              <li>The modal should explain the payment requirement</li>
              <li>Click "Set Up Payment Method" to open Stripe modal</li>
              <li>After setting up payment, buttons should work normally</li>
            </ol>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Expected Behavior:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
              <li>Modal appears when clicking restricted buttons</li>
              <li>Modal shows specific action being blocked</li>
              <li>Modal explains billing (£1 per student monthly)</li>
              <li>Modal shows list of blocked features</li>
              <li>Stripe payment setup works correctly</li>
              <li>After payment setup, actions work normally</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
