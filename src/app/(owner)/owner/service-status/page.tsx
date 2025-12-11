'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Database,
  CreditCard,
  Mail,
  Webhook,
  Settings,
  Loader2
} from 'lucide-react'

export default function ServiceStatusPage() {
  const { data: session, status } = useSession()
  const [serviceStatus, setServiceStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchServiceStatus = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/owner/service-status')
      if (response.ok) {
        const data = await response.json()
        setServiceStatus(data)
      } else {
        toast.error('Failed to load service status')
      }
    } catch (error) {
      toast.error('Failed to load service status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) return
    fetchServiceStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchServiceStatus, 30000)
    return () => clearInterval(interval)
  }, [status, session])

  if (status === 'loading' || loading || !serviceStatus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <SplitTitle title="Service Status" />
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'accessible':
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'disconnected':
      case 'connection_failed':
      case 'unreachable':
      case 'not_configured':
      case 'incomplete':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
      case 'accessible':
      case 'complete':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>
      case 'disconnected':
      case 'connection_failed':
      case 'unreachable':
      case 'not_configured':
      case 'incomplete':
        return <Badge variant="destructive">Not Connected</Badge>
      default:
        return <Badge variant="outline" className="border-yellow-600 text-yellow-600">Warning</Badge>
    }
  }

  const { overall, checks } = serviceStatus

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <SplitTitle title="Service Status" />
        <Button
          onClick={fetchServiceStatus}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {overall.status === 'all_connected' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
            Overall Status
          </CardTitle>
          <CardDescription>
            Last checked: {new Date(overall.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {getStatusBadge(overall.status === 'all_connected' ? 'connected' : 'incomplete')}
            <span className="text-sm text-gray-600">
              {overall.connected} of {overall.total} services connected
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Service Checks */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(checks.database?.status)}
                {getStatusBadge(checks.database?.status)}
              </div>
            </div>
            {checks.database?.provider && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Provider:</span> {checks.database.provider}
              </div>
            )}
            {checks.database?.responseTime && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Response Time:</span> {checks.database.responseTime}
              </div>
            )}
            {checks.database?.connectionString && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Connection:</span> {checks.database.connectionString}
              </div>
            )}
            {checks.database?.error && (
              <div className="text-sm text-red-600 mt-2">
                <span className="font-medium">Error:</span> {checks.database.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(checks.stripe?.status)}
                {getStatusBadge(checks.stripe?.status)}
              </div>
            </div>
            {checks.stripe?.apiKey && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">API Key:</span> {checks.stripe.apiKey}
              </div>
            )}
            {checks.stripe?.webhookSecret && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Webhook Secret:</span> {checks.stripe.webhookSecret}
              </div>
            )}
            {checks.stripe?.priceId && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Price ID:</span> {checks.stripe.priceId}
              </div>
            )}
            {checks.stripe?.priceInfo && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Price:</span> {checks.stripe.priceInfo}
              </div>
            )}
            {checks.stripe?.responseTime && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Response Time:</span> {checks.stripe.responseTime}
              </div>
            )}
            {checks.stripe?.error && (
              <div className="text-sm text-red-600 mt-2">
                <span className="font-medium">Error:</span> {checks.stripe.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(checks.email?.status)}
                {getStatusBadge(checks.email?.status)}
              </div>
            </div>
            {checks.email?.provider && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Provider:</span> {checks.email.provider}
              </div>
            )}
            {checks.email?.apiKey && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">API Key:</span> {checks.email.apiKey}
              </div>
            )}
            {checks.email?.fromAddress && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">From Address:</span> {checks.email.fromAddress}
              </div>
            )}
            {checks.email?.responseTime && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Response Time:</span> {checks.email.responseTime}
              </div>
            )}
            {checks.email?.error && (
              <div className="text-sm text-red-600 mt-2">
                <span className="font-medium">Error:</span> {checks.email.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(checks.webhook?.status)}
                {getStatusBadge(checks.webhook?.status)}
              </div>
            </div>
            {checks.webhook?.url && (
              <div className="text-sm text-gray-600 break-all">
                <span className="font-medium">URL:</span> {checks.webhook.url}
              </div>
            )}
            {checks.webhook?.method && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Method:</span> {checks.webhook.method}
              </div>
            )}
            {checks.webhook?.responseTime && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Response Time:</span> {checks.webhook.responseTime}
              </div>
            )}
            {checks.webhook?.events && checks.webhook.events.length > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Events:</span> {checks.webhook.events.length} configured
              </div>
            )}
            {checks.webhook?.error && (
              <div className="text-sm text-red-600 mt-2">
                <span className="font-medium">Error:</span> {checks.webhook.error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Environment Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(checks.environment?.status)}
                {getStatusBadge(checks.environment?.status)}
              </div>
            </div>
            {checks.environment?.missing && checks.environment.missing.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">Missing Variables:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {checks.environment.missing.map((varName: string) => (
                    <li key={varName}>{varName}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(checks.environment?.variables || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{value.name}</span>
                  <span className={`text-sm ${value.status === 'set' ? 'text-green-600' : 'text-red-600'}`}>
                    {value.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

