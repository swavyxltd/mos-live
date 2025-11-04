'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function AccountDeactivatedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700">Account Deactivated</CardTitle>
          </div>
          <CardDescription>
            Your organization account has been deactivated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Assalamu alaikum,
          </p>
          <p className="text-gray-700">
            Your Madrasah OS account has been deactivated. All access to the platform has been blocked and billing has been stopped.
          </p>
          <p className="text-gray-700">
            If you believe this is an error or if you have any questions, please contact us at{' '}
            <a href="mailto:support@madrasah.io" className="text-blue-600 hover:underline">
              support@madrasah.io
            </a>
            .
          </p>
          <p className="text-gray-700 mt-4">
            Jazakallahu Khairan for being part of our community. We wish you all the best.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

