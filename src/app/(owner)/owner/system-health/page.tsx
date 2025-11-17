'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Activity, 
  Server,
  Database,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Eye,
  Zap,
  Shield,
  HardDrive,
  Cpu,
  Wifi,
  Monitor,
  Users
} from 'lucide-react'

export default function OwnerSystemHealthPage() {
  const { data: session, status } = useSession()
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSystemHealth = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/owner/system-health')
      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
      } else {
        toast.error('Failed to load system health data')
      }
    } catch (error) {
      toast.error('Failed to load system health data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) return
    fetchSystemHealth()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [status, session])

  if (status === 'loading' || loading || !systemHealth) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to access this page.</div>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge variant="outline" className="text-green-600">Operational</Badge>
      case 'degraded':
        return <Badge variant="outline" className="text-yellow-600">Degraded</Badge>
      case 'outage':
        return <Badge variant="outline" className="text-red-600">Outage</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'major':
        return <Badge variant="outline" className="text-red-600">Major</Badge>
      case 'minor':
        return <Badge variant="outline" className="text-yellow-600">Minor</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'outage':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'unhealthy':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(systemHealth, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `system-health-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('System health report exported')
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">System Health</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">
            Monitor platform performance, uptime, and system reliability
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSystemHealth}
            disabled={refreshing}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </Button>
          <Button size="sm" onClick={handleExport} className="whitespace-nowrap">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Overall Status" />
            <Activity className={`h-4 w-4 flex-shrink-0 ${getOverallStatusColor(systemHealth.overallStatus.status)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getOverallStatusColor(systemHealth.overallStatus.status)} capitalize`}>
              {systemHealth.overallStatus.status}
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Uptime" />
            <Server className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.overallStatus.uptime.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Response Time" />
            <Zap className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(systemHealth.overallStatus.responseTime)}ms</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Error Rate" />
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.overallStatus.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Real-time status of all platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemHealth.services.map((service: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-500">
                      Last checked: {new Date(service.lastCheck).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{Math.round(service.responseTime)}ms</p>
                    <p className="text-xs text-gray-500">Response time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{service.uptime.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">Uptime</p>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics and Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>System performance and resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Avg Response Time</span>
                </div>
                <Badge variant="outline">{Math.round(systemHealth.performance.averageResponseTime)}ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Requests/Min</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.requestsPerMinute}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Concurrent Users</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.concurrentUsers}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">DB Connections</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.databaseConnections}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.cpuUsage.toFixed(1)}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.memoryUsage.toFixed(1)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Security Metrics</CardTitle>
            <CardDescription>Security monitoring and threat detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Firewall Status</span>
                </div>
                <Badge variant="outline" className="text-green-600 bg-green-50 border-0 dark:bg-green-950 dark:text-green-200">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Failed Logins</span>
                </div>
                <Badge variant="outline">{systemHealth.security.failedLoginAttempts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Blocked IPs</span>
                </div>
                <Badge variant="outline">{systemHealth.security.blockedIPs}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Security Alerts</span>
                </div>
                <Badge variant="outline">{systemHealth.security.securityAlerts}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">SSL Certificate</span>
                </div>
                <Badge variant="outline" className="text-green-600">Valid</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Last Security Scan</span>
                </div>
                <Badge variant="outline">
                  {new Date(systemHealth.security.lastSecurityScan).toLocaleDateString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      {systemHealth.recentIncidents && systemHealth.recentIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>System incidents and outages from the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.recentIncidents.map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-gray-500">{incident.description}</p>
                      </div>
                      {getSeverityBadge(incident.severity)}
                      <Badge variant={incident.status === 'resolved' ? 'outline' : 'secondary'}>
                        {incident.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Duration: {incident.duration}</span>
                      <span>Services: {incident.affectedServices.join(', ')}</span>
                      <span>Started: {new Date(incident.startTime).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Infrastructure */}
      <Card>
        <CardHeader>
          <CardTitle>Infrastructure</CardTitle>
          <CardDescription>Platform infrastructure and resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Servers</span>
              </div>
              <Badge variant="outline">{systemHealth.infrastructure.servers}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Databases</span>
              </div>
              <Badge variant="outline">{systemHealth.infrastructure.databases}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">CDN Nodes</span>
              </div>
              <Badge variant="outline">{systemHealth.infrastructure.cdnNodes}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Storage Used</span>
              </div>
              <Badge variant="outline">{systemHealth.infrastructure.storageUsed}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Bandwidth</span>
              </div>
              <Badge variant="outline">{systemHealth.infrastructure.bandwidthUsage}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Backup Status</span>
              </div>
              <Badge variant="outline" className="text-green-600">
                {systemHealth.infrastructure.backupStatus}
              </Badge>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Last backup: {new Date(systemHealth.infrastructure.lastBackup).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
