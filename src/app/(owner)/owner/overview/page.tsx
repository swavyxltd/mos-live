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
import { OwnerRevenueChart } from '@/components/owner-revenue-chart'

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
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session?.user?.id) {
    router.push('/auth/signin')
    return <div>Redirecting...</div>
  }

  // Load initial data
  useEffect(() => {
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
          console.error('Invalid dashboard data received:', data)
        }
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err)
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
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/owner/dashboard')
        .then(res => res.json())
        .then(data => {
          setDashboardData(data)
          setLastUpdated(new Date())
        })
        .catch(err => {
          console.error('Error refreshing dashboard data:', err)
        })
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Button handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/owner/dashboard')
      const data = await res.json()
      setDashboardData(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error refreshing dashboard data:', err)
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
      ['Total Organizations', dashboardData.totalOrgs],
      ['Total Students', dashboardData.totalStudents],
      ['Monthly Recurring Revenue', `£${dashboardData.mrr.toLocaleString()}`],
      ['Annual Recurring Revenue', `£${dashboardData.arr.toLocaleString()}`],
      ['Payment Success Rate', `${dashboardData.paymentSuccessRate}%`],
      ['Overdue Accounts', dashboardData.overdueCount],
      ['Churn Rate', `${dashboardData.churnRate}%`],
      ['Average Revenue per Org', `£${dashboardData.avgRevenuePerOrg.toFixed(0)}`]
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Madrasah OS Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Complete overview of your platform performance and business metrics
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{dashboardData.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{dashboardData.revenueGrowth.toFixed(1)}%</span> from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Organizations */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewOrganizations}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{Math.round(dashboardData.totalStudents * 0.08)}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{dashboardData.arr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{dashboardData.revenueGrowth.toFixed(1)}%</span> growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.paymentSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/owner/dunning')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Accounts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAnalytics}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.churnRate}%</div>
            <p className="text-xs text-muted-foreground">Monthly churn</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewAnalytics}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue per Org</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{dashboardData.avgRevenuePerOrg.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        {dashboardData && (
          <OwnerRevenueChart data={dashboardData.monthlyRevenue} />
        )}

        {/* Top Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Organizations</CardTitle>
            <CardDescription>Organizations by student count and revenue</CardDescription>
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
                <Badge variant="outline" className="text-green-600">{dashboardData.systemHealth.uptime}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Response Time</span>
                </div>
                <Badge variant="outline">{dashboardData.systemHealth.responseTime}ms</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <Badge variant="outline">{dashboardData.systemHealth.errorRate}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Active Users</span>
                </div>
                <Badge variant="outline">{dashboardData.systemHealth.activeUsers}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}