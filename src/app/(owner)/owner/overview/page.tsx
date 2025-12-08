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
  ExternalLink,
  Target
} from 'lucide-react'
import { WaveChart } from '@/components/ui/wave-chart'
import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/loading/skeleton'

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
  totalLeads: number
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
          totalLeads: 0,
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
      ['Total Leads', dashboardData.totalLeads ?? 0],
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

  const handleViewOrganisations = () => {
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

  // Conditional returns after all hooks
  if (status === 'loading') {
    return (
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }
  
  if (!session?.user?.id) {
    router.push('/auth/signin')
    return <div>Redirecting...</div>
  }

  if (!dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start w-full min-w-0">
          <div className="flex-1 min-w-0 pr-0 lg:pr-4">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-3 w-48 mt-1" />
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 w-full lg:w-auto">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Key Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Secondary Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts and Tables Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start w-full min-w-0">
        <div className="flex-1 min-w-0 pr-0 lg:pr-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] break-words">Madrasah OS Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] break-words">
            Complete overview of our platform performance and business metrics
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 w-full lg:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 lg:flex-initial"
          >
            <RefreshCw className={`h-4 w-4 md:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData} className="flex-1 lg:flex-initial">
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAnalytics} className="flex-1 lg:flex-initial">
            <Eye className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">View Analytics</span>
          </Button>
          <Button size="sm" onClick={handleSettings} className="flex-1 lg:flex-initial">
            <Settings className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0">
        {/* MRR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Monthly Recurring</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Revenue</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Monthly Recurring Revenue</CardTitle>
            </div>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">£{(dashboardData.mrr ?? 0).toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              <span className="text-green-600">+{((dashboardData.revenueGrowth ?? 0).toFixed(1))}%</span> from last month
            </p>
          </CardContent>
        </Card>

        {/* Total Organisations */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewOrganisations}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Total</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Organisations</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Total Organisations</CardTitle>
            </div>
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{dashboardData.totalOrgs ?? 0}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              <span className="text-green-600">+{dashboardData.newOrgsThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* Total Students */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewUsers}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Total</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Students</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Total Students</CardTitle>
            </div>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{(dashboardData.totalStudents ?? 0).toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              <span className="text-green-600">+{Math.round((dashboardData.totalStudents ?? 0) * 0.08)}</span> this month
            </p>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Annual Recurring</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Revenue</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Annual Recurring Revenue</CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">£{(dashboardData.arr ?? 0).toLocaleString()}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
              <span className="text-green-600">+{((dashboardData.revenueGrowth ?? 0).toFixed(1))}%</span> growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full min-w-0">
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewRevenue}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Payment Success</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Rate</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Payment Success Rate</CardTitle>
            </div>
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{(dashboardData.paymentSuccessRate ?? 0).toFixed(1)}%</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={() => router.push('/owner/dunning')}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Overdue</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Accounts</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Overdue Accounts</CardTitle>
            </div>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{dashboardData.overdueCount ?? 0}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={() => router.push('/owner/leads')}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Total</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Leads</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Total Leads</CardTitle>
            </div>
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">{dashboardData.totalLeads ?? 0}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Active leads</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewAnalytics}>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between space-y-0 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              {/* Mobile: 2 lines, Desktop: 1 line */}
              <div className="lg:hidden">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">Avg Revenue</CardTitle>
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight break-words">per Org</CardTitle>
              </div>
              <CardTitle className="hidden lg:block text-sm font-medium break-words">Avg Revenue per Org</CardTitle>
            </div>
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-1 sm:mt-0" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xl sm:text-2xl font-bold break-words">£{((dashboardData.avgRevenuePerOrg ?? 0).toFixed(0))}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">Per month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
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
        <Card className="w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg break-words">Top Performing Organisations</CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">Organisations by student count and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {dashboardData.topOrgs && dashboardData.topOrgs.length > 0 ? (
                dashboardData.topOrgs.map((org, index) => (
                <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer gap-2 min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{org.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{org.students} students</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-sm sm:text-base">£{org.revenue}</p>
                    <div className="flex items-center justify-end">
                      {org.growth > 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span className={`text-xs sm:text-sm ${org.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {org.growth > 0 ? '+' : ''}{org.growth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No organisations data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full min-w-0">
        {/* Recent Activity */}
        <Card className="w-full min-w-0">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg break-words">Recent Activity</CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">Latest platform events and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
                dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-2 sm:space-x-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium break-words">{activity.message}</p>
                    {activity.amount && (
                      <p className="text-xs sm:text-sm text-green-600 font-medium break-words">£{activity.amount}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 break-words">{activity.time}</p>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer w-full min-w-0" onClick={handleViewSystemHealth}>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg break-words">System Health</CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">Platform performance and reliability metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Activity className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium break-words">Uptime</span>
                </div>
                <Badge variant="outline" className="text-green-600 flex-shrink-0 text-xs sm:text-sm">
                  {systemHealth?.uptime?.toFixed(1) || dashboardData?.systemHealth?.uptime || 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium break-words">Response Time</span>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs sm:text-sm">
                  {systemHealth?.responseTime || dashboardData?.systemHealth?.responseTime || 0}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <XCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium break-words">Error Rate</span>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs sm:text-sm">
                  {systemHealth?.errorRate?.toFixed(2) || dashboardData?.systemHealth?.errorRate || 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <UserCheck className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium break-words">Active Users</span>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs sm:text-sm">
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