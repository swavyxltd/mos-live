import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    return <div>Loading...</div>
  }

  // Comprehensive analytics data
  const analyticsData = {
    // Revenue Analytics
    revenue: {
      currentMRR: 1247,
      lastMonthMRR: 1150,
      growth: 8.4,
      arr: 14964,
      lifetimeValue: 18750,
      averageRevenuePerUser: 26.5
    },
    
    // Growth Metrics
    growth: {
      newOrgsThisMonth: 4,
      newStudentsThisMonth: 97,
      churnRate: 2.1,
      retentionRate: 97.9,
      expansionRevenue: 156,
      contractionRevenue: 23
    },
    
    // User Analytics
    users: {
      totalActiveUsers: 89,
      newUsersThisMonth: 12,
      userGrowthRate: 15.6,
      averageSessionDuration: 24.5,
      pageViewsPerSession: 8.3,
      bounceRate: 12.4
    },
    
    // Geographic Distribution
    geography: {
      topRegions: [
        { region: 'London', orgs: 12, students: 456, revenue: 456 },
        { region: 'Manchester', orgs: 8, students: 234, revenue: 234 },
        { region: 'Birmingham', orgs: 6, students: 189, revenue: 189 },
        { region: 'Leeds', orgs: 5, students: 156, revenue: 156 },
        { region: 'Liverpool', orgs: 4, students: 123, revenue: 123 }
      ]
    },
    
    // Organization Size Distribution
    orgSizes: [
      { size: '1-10 students', count: 15, percentage: 32 },
      { size: '11-25 students', count: 18, percentage: 38 },
      { size: '26-50 students', count: 10, percentage: 21 },
      { size: '51-100 students', count: 3, percentage: 6 },
      { size: '100+ students', count: 1, percentage: 2 }
    ],
    
    // Payment Analytics
    payments: {
      successRate: 96.8,
      averagePaymentTime: 2.3,
      failedPayments: 3,
      refunds: 1,
      chargebacks: 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Analytics Dashboard</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{analyticsData.revenue.growth}%</div>
            <p className="text-xs text-muted-foreground">
              £{analyticsData.revenue.currentMRR} vs £{analyticsData.revenue.lastMonthMRR}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Acquisition</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{analyticsData.growth.newOrgsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              New organizations this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.growth.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Monthly retention rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{analyticsData.revenue.averageRevenuePerUser}</div>
            <p className="text-xs text-muted-foreground">
              Average revenue per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend Analysis</CardTitle>
            <CardDescription>Monthly recurring revenue and growth patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">Revenue trend chart</p>
                <p className="text-xs text-gray-400">Current MRR: £{analyticsData.revenue.currentMRR.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Size Distribution</CardTitle>
            <CardDescription>Distribution of organizations by student count</CardDescription>
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
            <CardDescription>Organizations and revenue by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.geography.topRegions.map((region, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{region.region}</p>
                    <p className="text-sm text-gray-500">{region.orgs} organizations</p>
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

