'use client'
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Mail, Phone } from 'lucide-react'

export default function AccountSuspendedPage() {
  const searchParams = useSearchParams()
  const orgName = searchParams.get('org') || 'your organization'
  const reason = searchParams.get('reason') || 'No reason provided'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Account Suspended</CardTitle>
            <CardDescription className="text-red-700">
              Your organization account has been suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                <strong>{orgName}</strong> account has been suspended.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Reason: {reason}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">What does this mean?</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• All admin, staff, and teacher accounts are locked</li>
                <li>• You cannot access the organization dashboard</li>
                <li>• Students and parents can still access their accounts</li>
                <li>• Contact support to resolve the issue</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Need help?</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>Email: support@madrasah-os.com</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>Phone: +44 20 1234 5678</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
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
    </div>
  )
}
