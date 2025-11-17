'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Copy, Check } from 'lucide-react'

interface CopyApplicationLinkModalProps {
  orgSlug: string
  onClose: () => void
}

export function CopyApplicationLinkModal({ orgSlug, onClose }: CopyApplicationLinkModalProps) {
  const [applicationLink, setApplicationLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Construct the application link using the provided orgSlug
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    setApplicationLink(`${baseUrl}/apply/${orgSlug}`)
  }, [orgSlug])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
    }
  }

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Copy Application Link</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share this link with parents to allow them to submit applications for your madrasah.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Public Application Link
              </label>
              <div className="flex space-x-2">
                <Input
                  value={applicationLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleCopy}
                  variant={copied ? "default" : "outline"}
                  size="sm"
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

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This link is public and doesn't require login. 
                Parents can use it to submit applications directly.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
