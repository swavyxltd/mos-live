'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Test Email from Madrasah OS'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Failed to send email'
        const error = new Error(errorMessage)
        ;(error as any).response = { data }
        throw error
      }

      setResult({
        success: true,
        ...data
      })
      toast.success('Test email sent successfully!')
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send test email'
      setResult({
        success: false,
        error: errorMessage,
        details: error.response?.data || error.details
      })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Sending
          </CardTitle>
          <CardDescription>
            Test if email sending is working correctly with your Resend configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleTest()}
            />
          </div>

          <Button 
            onClick={handleTest} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.success ? 'Email Sent Successfully!' : 'Failed to Send Email'}
                  </h3>
                  {result.success ? (
                    <div className="text-sm text-green-800 space-y-1">
                      <p><strong>Email ID:</strong> {result.emailId || 'N/A'}</p>
                      <p><strong>To:</strong> {result.details?.to}</p>
                      <p><strong>Subject:</strong> {result.details?.subject}</p>
                      <p><strong>Sent At:</strong> {new Date(result.details?.sentAt).toLocaleString()}</p>
                      <p className="mt-2 text-xs">
                        Check your inbox (and spam folder) for the test email.
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-800 space-y-1">
                      <p><strong>Error:</strong> {result.error}</p>
                      {result.message && result.message !== result.error && <p>{result.message}</p>}
                      {result.details && (
                        <div className="mt-2">
                          <p className="font-semibold mb-1">Details:</p>
                          <pre className="text-xs bg-red-100 p-2 rounded overflow-auto">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Troubleshooting:</h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Check Vercel logs for detailed error messages</li>
              <li>Verify your domain is verified in Resend dashboard</li>
              <li>Ensure RESEND_API_KEY is set correctly in Vercel</li>
              <li>Check spam folder if email appears sent but not received</li>
              <li>Verify the "from" address domain is authorized in Resend</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

