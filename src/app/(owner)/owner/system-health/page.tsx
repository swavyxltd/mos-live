import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export default async function OwnerSystemHealthPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // System health data
  const systemHealth = {
    // Overall status
    overallStatus: {
      status: 'healthy',
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.02,
      lastIncident: '2024-11-15T14:30:00Z'
    },
    
    // Service status
    services: [
      {
        name: 'Web Application',
        status: 'operational',
        responseTime: 120,
        uptime: 99.95,
        lastCheck: '2024-12-06T10:30:00Z'
      },
      {
        name: 'Database',
        status: 'operational',
        responseTime: 45,
        uptime: 99.98,
        lastCheck: '2024-12-06T10:30:00Z'
      },
      {
        name: 'Payment Processing',
        status: 'operational',
        responseTime: 280,
        uptime: 99.92,
        lastCheck: '2024-12-06T10:30:00Z'
      },
      {
        name: 'Email Service',
        status: 'operational',
        responseTime: 180,
        uptime: 99.88,
        lastCheck: '2024-12-06T10:30:00Z'
      },
      {
        name: 'File Storage',
        status: 'operational',
        responseTime: 95,
        uptime: 99.97,
        lastCheck: '2024-12-06T10:30:00Z'
      },
      {
        name: 'Authentication',
        status: 'operational',
        responseTime: 65,
        uptime: 99.99,
        lastCheck: '2024-12-06T10:30:00Z'
      }
    ],
    
    // Performance metrics
    performance: {
      averageResponseTime: 145,
      p95ResponseTime: 320,
      p99ResponseTime: 850,
      requestsPerMinute: 1250,
      concurrentUsers: 89,
      databaseConnections: 45,
      memoryUsage: 68.5,
      cpuUsage: 42.3,
      diskUsage: 34.7
    },
    
    // Recent incidents
    recentIncidents: [
      {
        id: 'inc-001',
        title: 'Database connection timeout',
        severity: 'minor',
        status: 'resolved',
        startTime: '2024-11-15T14:30:00Z',
        endTime: '2024-11-15T14:45:00Z',
        duration: '15 minutes',
        affectedServices: ['Database', 'Web Application'],
        description: 'Temporary database connection issues causing slow response times'
      },
      {
        id: 'inc-002',
        title: 'Payment processing delays',
        severity: 'major',
        status: 'resolved',
        startTime: '2024-11-10T09:15:00Z',
        endTime: '2024-11-10T10:30:00Z',
        duration: '1 hour 15 minutes',
        affectedServices: ['Payment Processing'],
        description: 'Stripe API rate limiting causing payment processing delays'
      },
      {
        id: 'inc-003',
        title: 'Email delivery issues',
        severity: 'minor',
        status: 'resolved',
        startTime: '2024-11-05T16:20:00Z',
        endTime: '2024-11-05T16:35:00Z',
        duration: '15 minutes',
        affectedServices: ['Email Service'],
        description: 'Temporary email delivery delays due to provider maintenance'
      }
    ],
    
    // Security metrics
    security: {
      failedLoginAttempts: 12,
      blockedIPs: 3,
      securityAlerts: 1,
      lastSecurityScan: '2024-12-05T02:00:00Z',
      sslCertificateExpiry: '2025-06-15T00:00:00Z',
      firewallStatus: 'active'
    },
    
    // Infrastructure
    infrastructure: {
      servers: 3,
      databases: 2,
      cdnNodes: 5,
      backupStatus: 'healthy',
      lastBackup: '2024-12-06T03:00:00Z',
      storageUsed: '2.3 TB',
      bandwidthUsage: '145 GB/day'
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">System Health</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Monitor platform performance, uptime, and system reliability
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Overall Status" />
            <Activity className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
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
            <div className="text-2xl font-bold">{systemHealth.overallStatus.uptime}%</div>
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
            <div className="text-2xl font-bold">{systemHealth.overallStatus.responseTime}ms</div>
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
            <div className="text-2xl font-bold">{systemHealth.overallStatus.errorRate}%</div>
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
            {systemHealth.services.map((service, index) => (
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
                    <p className="text-sm font-medium">{service.responseTime}ms</p>
                    <p className="text-xs text-gray-500">Response time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{service.uptime}%</p>
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
                <Badge variant="outline">{systemHealth.performance.averageResponseTime}ms</Badge>
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
                <Badge variant="outline">{systemHealth.performance.cpuUsage}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <Badge variant="outline">{systemHealth.performance.memoryUsage}%</Badge>
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
                <Badge variant="outline" className="text-green-600">Active</Badge>
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
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
          <CardDescription>System incidents and outages from the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemHealth.recentIncidents.map((incident) => (
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
    </div>
  )
}
