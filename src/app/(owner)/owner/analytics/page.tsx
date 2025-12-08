import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AnalyticsRevenueChart } from '@/components/analytics-revenue-chart'
import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/loading/skeleton'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building2, 
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter
} from 'lucide-react'

export default async function OwnerAnalyticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Fetch analytics data from API
  let analyticsData: any = {
    revenue: { currentMRR: 0, lastMonthMRR: 0, growth: 0, arr: 0, lifetimeValue: 0, averageRevenuePerUser: 0 },
    growth: { newOrgsThisMonth: 0, newStudentsThisMonth: 0, churnRate: 0, retentionRate: 0, expansionRevenue: 0, contractionRevenue: 0 },
    users: { totalActiveUsers: 0, newUsersThisMonth: 0, userGrowthRate: 0, averageSessionDuration: 0, pageViewsPerSession: 0, bounceRate: 0 },
    geography: { topRegions: [] },
    orgSizes: [],
    payments: { successRate: 0, averagePaymentTime: 0, failedPayments: 0, refunds: 0, chargebacks: 0 },
    revenueTrend: []
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://app.madrasah.io')
    const analyticsRes = await fetch(`${baseUrl}/api/owner/analytics`, {
      cache: 'no-store'
    })
    
    if (analyticsRes.ok) {
      analyticsData = await analyticsRes.json()
    }
  } catch (error) {
  }

  // Show skeleton if no data
  if (!analyticsData || Object.keys(analyticsData).length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>

        {/* Geographic and User Analytics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-64" />
          <CardSkeleton className="h-64" />
        </div>

        {/* Payment Analytics Skeleton */}
        <CardSkeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Deep insights into your platform performance and growth metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="MRR Growth" />
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{analyticsData.revenue.growth}%</div>
            <p className="text-sm text-muted-foreground">
              £{analyticsData.revenue.currentMRR} vs £{analyticsData.revenue.lastMonthMRR}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Customer Acquisition" />
            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{analyticsData.growth.newOrgsThisMonth}</div>
            <p className="text-sm text-muted-foreground">
              New organisations this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Retention Rate" />
            <Activity className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.growth.retentionRate}%</div>
            <p className="text-sm text-muted-foreground">
              Monthly retention rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="ARPU" />
            <DollarSign className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{analyticsData.revenue.averageRevenuePerUser}</div>
            <p className="text-sm text-muted-foreground">
              Average revenue per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <AnalyticsRevenueChart data={analyticsData.revenueTrend} />

        {/* Organisation Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Organisation Size Distribution</CardTitle>
            <CardDescription>Distribution of organisations by student count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.orgSizes.map((size, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{size.size}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{size.count} orgs</span>
                    <Badge variant="outline">{size.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic and User Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Organisations and revenue by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.geography.topRegions.map((region, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{region.region}</p>
                    <p className="text-sm text-gray-500">{region.orgs} organisations</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{region.students} students</p>
                    <p className="text-sm text-green-600">£{region.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Metrics</CardTitle>
            <CardDescription>Platform usage and user behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Users</span>
                <Badge variant="outline">{analyticsData.users.totalActiveUsers}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Users (30d)</span>
                <Badge variant="outline" className="text-green-600">+{analyticsData.users.newUsersThisMonth}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Session Duration</span>
                <Badge variant="outline">{analyticsData.users.averageSessionDuration} min</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page Views/Session</span>
                <Badge variant="outline">{analyticsData.users.pageViewsPerSession}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bounce Rate</span>
                <Badge variant="outline" className="text-green-600">{analyticsData.users.bounceRate}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Performance</CardTitle>
          <CardDescription>Payment success rates and processing metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analyticsData.payments.successRate}%</div>
              <p className="text-sm text-gray-500">Success Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analyticsData.payments.averagePaymentTime} days</div>
              <p className="text-sm text-gray-500">Avg Payment Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analyticsData.payments.failedPayments}</div>
              <p className="text-sm text-gray-500">Failed Payments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analyticsData.payments.refunds}</div>
              <p className="text-sm text-gray-500">Refunds</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analyticsData.payments.chargebacks}</div>
              <p className="text-sm text-gray-500">Chargebacks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

