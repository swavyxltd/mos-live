'use client'
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, Mail, AlertCircle } from 'lucide-react'

function AccountDeactivatedContent() {
  const searchParams = useSearchParams()
  const orgName = searchParams.get('org') || 'your organisation'
  const reason = searchParams.get('reason') || 'No reason provided'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo above card */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Madrasah OS" 
            className="w-[198px] h-auto"
          />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Organisation Info */}
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                  <X className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <p className="text-gray-900 font-medium mb-1">
                <strong>{orgName}</strong> account has been deactivated
              </p>
              <p className="text-sm text-gray-500">
                Reason: {reason}
              </p>
            </div>

            {/* What does this mean */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">What does this mean?</h3>
                  <ul className="text-sm text-gray-700 space-y-1.5 mt-2">
                    <li className="flex items-center gap-2">
                      <span className="text-red-600">•</span>
                      <span>All admin, staff, and teacher accounts are permanently locked</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600">•</span>
                      <span>You cannot access the organisation dashboard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600">•</span>
                      <span>Students and parents can still access their accounts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600">•</span>
                      <span>All billing has been stopped</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600">•</span>
                      <span>If you want to reactivate, please contact us</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Goodbye Message */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Inshallah, see you again soon.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Want to reactivate?</h3>
              <p className="text-sm text-gray-600">
                If you would like to reactivate your account, please contact us:
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>support@madrasah.io</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/auth/signin'}
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountDeactivatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <AccountDeactivatedContent />
    </Suspense>
  )
}

