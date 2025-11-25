'use client'

import { useEffect, useState } from 'react'

export default function PaymentFailedEmailPreview() {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadEmail() {
      try {
        const response = await fetch('/api/preview-email/payment-failed')
        if (response.ok) {
          const emailHtml = await response.text()
          setHtml(emailHtml)
        }
      } catch (error) {
        console.error('Error loading email:', error)
      } finally {
        setLoading(false)
      }
    }
    loadEmail()
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading email preview...</p>
        </div>
      </div>
    )
  }
  
  if (!html) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">Error loading email preview</p>
      </div>
    )
  }
  
  return (
    <div className="w-full h-screen overflow-hidden">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0"
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  )
}
