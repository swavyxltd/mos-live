'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  BarChart3,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Bell,
  ExternalLink
} from 'lucide-react'
import { WaveChart } from '@/components/ui/wave-chart'

interface DashboardData {
  totalOrgs: number
  totalStudents: number
  totalUsers: number
  mrr: number
  arr: number
  lastMonthRevenue: number
  thisMonthRevenue: number
  revenueGrowth: number
  overdueCount: number
  paymentSuccessRate: number
  newOrgsThisMonth: number
  churnRate: number
  avgRevenuePerOrg: number
  monthlyRevenue: Array<{ month: string; revenue: number; students: number }>
  topOrgs: Array<{ name: string; students: number; revenue: number; growth: number; status: string }>
  recentActivity: Array<{ type: string; message: string; amount?: number; time: string; status: string }>
  systemHealth: {
    uptime: number
    responseTime: number
    errorRate: number
    activeUsers: number
  }
}

export default function OwnerOverviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [systemHealth, setSystemHealth] = useState<{
    uptime: number
    responseTime: number
    errorRate: number
    activeUsers: number
  } | null>(null)
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session?.user?.id) {
    router.push('/auth/signin')
    return <div>Redirecting...</div>
  }

  // Load initial data
  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/owner/dashboard')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (data && typeof data === 'object') {
          setDashboardData(data)
          setLastUpdated(new Date())
        } else {
        }
      })
      .catch(err => {
        // Set default empty data to prevent crashes
        setDashboardData({
          totalOrgs: 0,
          totalStudents: 0,
          totalUsers: 0,
          mrr: 0,
          arr: 0,
          lastMonthRevenue: 0,
          thisMonthRevenue: 0,
          revenueGrowth: 0,
          overdueCount: 0,
          paymentSuccessRate: 0,
          newOrgsThisMonth: 0,
          churnRate: 0,
          avgRevenuePerOrg: 0,
          monthlyRevenue: [],
          topOrgs: [],
          recentActivity: [],
          systemHealth: {
            uptime: 0,
            responseTime: 0,
            errorRate: 0,
            activeUsers: 0
          }
        })
      })
    
    // Fetch live system health data
    fetch('/api/owner/system-health')
      .then(res => res.json())
      .then(data => {
        if (data && data.overallStatus) {
          setSystemHealth({
            uptime: data.overallStatus.uptime || 0,
            responseTime: data.overallStatus.responseTime || 0,
            errorRate: data.overallStatus.errorRate || 0,
            activeUsers: data.performance?.concurrentUsers || 0
          })
        }
      })
      .catch(err => {
      })
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refreshDashboard = () => {
      fetch('/api/owner/dashboard')
        .then(res => res.json())
        .then(data => {
          setDashboardData(data)
          setLastUpdated(new Date())
        })
        .catch(err => {
        })
    }
    
    const refreshSystemHealth = () => {
      fetch('/api/owner/system-health')
        .then(res => res.json())
        .then(data => {
          if (data && data.overallStatus) {
            setSystemHealth({
              uptime: data.overallStatus.uptime || 0,
              responseTime: data.overallStatus.responseTime || 0,
              errorRate: data.overallStatus.errorRate || 0,
              activeUsers: data.performance?.concurrentUsers || 0
            })
          }
        })
        .catch(err => {
        })
    }
    
    // Listen for manual refresh events
    window.addEventListener('refresh-owner-dashboard', refreshDashboard)
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshDashboard()
      refreshSystemHealth()
    }, 30000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-owner-dashboard', refreshDashboard)
    }
  }, [])

  // Button handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/owner/dashboard')
      const data = await res.json()
      setDashboardData(data)
      setLastUpdated(new Date())
      
      // Also refresh system health
      const healthRes = await fetch('/api/owner/system-health')
      const healthData = await healthRes.json()
      if (healthData && healthData.overallStatus) {
        setSystemHealth({
          uptime: healthData.overallStatus.uptime || 0,
          responseTime: healthData.overallStatus.responseTime || 0,
          errorRate: healthData.overallStatus.errorRate || 0,
          activeUsers: healthData.performance?.concurrentUsers || 0
        })
      }
    } catch (err) {
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleViewAnalytics = () => {
    router.push('/owner/analytics')
  }

  const handleSettings = () => {
    router.push('/owner/settings')
  }

  const handleExportData = () => {
    if (!dashboardData) return
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Organisations', dashboardData.totalOrgs ?? 0],
      ['Total Students', dashboardData.totalStudents ?? 0],
      ['Monthly Recurring Revenue', `£${(dashboardData.mrr ?? 0).toLocaleString()}`],
      ['Annual Recurring Revenue', `£${(dashboardData.arr ?? 0).toLocaleString()}`],
      ['Payment Success Rate', `${dashboardData.paymentSuccessRate ?? 0}%`],
      ['Overdue Accounts', dashboardData.overdueCount ?? 0],
      ['Churn Rate', `${dashboardData.churnRate ?? 0}%`],
      ['Average Revenue per Org', `£${(dashboardData.avgRevenuePerOrg ?? 0).toFixed(0)}`]
    ]
    
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `madrasah-os-dashboard-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleViewOrganizations = () => {
    router.push('/owner/orgs')
  }

  const handleViewRevenue = () => {
    router.push('/owner/revenue')
  }

  const handleViewUsers = () => {
    router.push('/owner/users')
  }

  const handleViewSystemHealth = () => {
    router.push('/owner/system-health')
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Madrasah OS Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">
            Complete overview of our platform performance and business metrics
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAnalytics}>
            <Eye className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button size="sm" onClick={handleSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* MRR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Monthly Recurring</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Revenue</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{(dashboardData.mrr ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{((dashboardData.revenueGrowth ?? 0).toFixed(1))}%</span> from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Organizations */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewOrganizations}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Total</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Organisations</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Total Organisations</CardTitle>
            </div>
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalOrgs}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{dashboardData.newOrgsThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* Total Students */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewUsers}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Total</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Students</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Total Students</CardTitle>
            </div>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(dashboardData.totalStudents ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{Math.round((dashboardData.totalStudents ?? 0) * 0.08)}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Annual Recurring</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Revenue</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Annual Recurring Revenue</CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{(dashboardData.arr ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{((dashboardData.revenueGrowth ?? 0).toFixed(1))}%</span> growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Payment Success</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Rate</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Payment Success Rate</CardTitle>
            </div>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.paymentSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/owner/dunning')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Overdue</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Accounts</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Overdue Accounts</CardTitle>
            </div>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAnalytics}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Churn</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">Rate</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Churn Rate</CardTitle>
            </div>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.churnRate}%</div>
            <p className="text-xs text-muted-foreground">Monthly churn</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAnalytics}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="md:hidden">
                <CardTitle className="text-sm font-medium leading-tight">Avg Revenue</CardTitle>
                <CardTitle className="text-sm font-medium leading-tight">per Org</CardTitle>
              </div>
              <CardTitle className="hidden md:block text-sm font-medium">Avg Revenue per Org</CardTitle>
            </div>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{((dashboardData.avgRevenuePerOrg ?? 0).toFixed(0))}</div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        {dashboardData && dashboardData.monthlyRevenue && (
          <WaveChart
            title="Revenue Trend"
            subtitle="Monthly recurring revenue growth over time"
            data={dashboardData.monthlyRevenue.map(item => ({
              date: item.month,
              value: item.revenue
            }))}
            filterOptions={[
              { label: 'Last 12 months', value: '12m', active: true },
              { label: 'Last 6 months', value: '6m' },
              { label: 'Last 3 months', value: '3m' }
            ]}
            valueFormatter={(value) => `£${value.toLocaleString()}`}
            yAxisFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
            tooltipFormatter={(value) => `£${value.toLocaleString()}`}
            tooltipLabel="Revenue"
            domain="auto"
          />
        )}

        {/* Top Organisations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Organisations</CardTitle>
            <CardDescription>Organisations by student count and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topOrgs.map((org, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleViewOrganizations}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.students} students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">£{org.revenue}</p>
                    <div className="flex items-center">
                      {org.growth > 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span className={`text-xs ${org.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {org.growth > 0 ? '+' : ''}{org.growth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    {activity.amount && (
                      <p className="text-sm text-green-600 font-medium">£{activity.amount}</p>
                    )}
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewSystemHealth}>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform performance and reliability metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <Badge variant="outline" className="text-green-600">
                  {systemHealth?.uptime?.toFixed(1) || dashboardData?.systemHealth?.uptime || 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Response Time</span>
                </div>
                <Badge variant="outline">
                  {systemHealth?.responseTime || dashboardData?.systemHealth?.responseTime || 0}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <Badge variant="outline">
                  {systemHealth?.errorRate?.toFixed(2) || dashboardData?.systemHealth?.errorRate || 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <Badge variant="outline">
                  {systemHealth?.activeUsers || dashboardData?.systemHealth?.activeUsers || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}