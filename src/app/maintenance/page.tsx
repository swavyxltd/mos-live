'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock } from 'lucide-react'

export default function MaintenancePage() {
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [domain, setDomain] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaintenanceInfo()
  }, [])

  const fetchMaintenanceInfo = async () => {
    try {
      const response = await fetch('/api/maintenance/status')
      if (response.ok) {
        const data = await response.json()
        setMaintenanceMessage(data.message || null)
        setLogoUrl(data.logoUrl || null)
        setDomain(data.domain || null)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
      {/* Background image - same as auth page */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Content - centered */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md mb-6">
          {logoUrl && (
            <div className="flex justify-center mb-6">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-9 object-contain"
              />
            </div>
          )}
        </div>
        <div className="w-full max-w-md">
          <Card className="border-blue-200">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl text-blue-900">Maintenance Mode</CardTitle>
            <CardDescription className="text-blue-700 text-sm">
              The platform is currently under maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4">
                We're currently performing scheduled maintenance to improve the platform.
              </p>
              
              {maintenanceMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 whitespace-pre-line">
                    {maintenanceMessage}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Jazakallahu Khair for your patience.</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-center text-xs text-gray-500">
                <p>If you have urgent questions, please contact support:</p>
                <p className="mt-1">
                  <a 
                    href="mailto:support@madrasah.io" 
                    className="text-blue-600 hover:text-blue-800"
                  >
                    support@madrasah.io
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        {domain && (
          <div className="mt-8 text-center">
            <a 
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {domain}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

