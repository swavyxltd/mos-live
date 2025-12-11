'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Copy, Check } from 'lucide-react'

interface CopySignupLinkModalProps {
  orgSlug: string
  onClose: () => void
}

export function CopySignupLinkModal({ orgSlug, onClose }: CopySignupLinkModalProps) {
  const [signupLink, setSignupLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Construct the signup link using the provided orgSlug
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    setSignupLink(`${baseUrl}/parent/signup?org=${orgSlug}`)
  }, [orgSlug])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
    }
  }

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Copy Signup Link</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share this link with parents to allow them to sign up and link their account to their child's student record.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Public Signup Link
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={signupLink}
                  readOnly
                  className="flex-1 text-xs sm:text-sm"
                />
                <Button
                  onClick={handleCopy}
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs sm:text-sm text-gray-800">
                <strong>Note:</strong> This link is public and doesn't require login. 
                Parents can use it to sign up and verify their child's information to link their account.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6">
            <Button onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

