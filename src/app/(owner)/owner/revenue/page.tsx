import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default async function OwnerRevenuePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Revenue management data
  const revenueData = {
    // Current metrics
    current: {
      mrr: 1247,
      arr: 14964,
      totalRevenue: 18750,
      thisMonthCollected: 1156,
      pendingRevenue: 91,
      failedPayments: 3
    },
    
    // Revenue breakdown
    breakdown: {
      subscriptionRevenue: 1247,
      oneTimePayments: 0,
      refunds: 23,
      chargebacks: 0,
      netRevenue: 1224
    },
    
    // Payment status
    paymentStatus: {
      successful: 47,
      pending: 3,
      failed: 3,
      refunded: 1,
      successRate: 96.8
    },
    
    // Monthly revenue history
    monthlyRevenue: [
      { month: 'Jan 2024', revenue: 980, collected: 945, pending: 35, failed: 12 },
      { month: 'Feb 2024', revenue: 1050, collected: 1020, pending: 20, failed: 10 },
      { month: 'Mar 2024', revenue: 1120, collected: 1085, pending: 25, failed: 10 },
      { month: 'Apr 2024', revenue: 1080, collected: 1050, pending: 20, failed: 10 },
      { month: 'May 2024', revenue: 1150, collected: 1120, pending: 20, failed: 10 },
      { month: 'Jun 2024', revenue: 1200, collected: 1170, pending: 20, failed: 10 },
      { month: 'Jul 2024', revenue: 1180, collected: 1150, pending: 20, failed: 10 },
      { month: 'Aug 2024', revenue: 1220, collected: 1190, pending: 20, failed: 10 },
      { month: 'Sep 2024', revenue: 1190, collected: 1160, pending: 20, failed: 10 },
      { month: 'Oct 2024', revenue: 1230, collected: 1200, pending: 20, failed: 10 },
      { month: 'Nov 2024', revenue: 1150, collected: 1120, pending: 20, failed: 10 },
      { month: 'Dec 2024', revenue: 1247, collected: 1156, pending: 91, failed: 3 }
    ],
    
    // Failed payments requiring attention
    failedPayments: [
      {
        id: 'fp-001',
        orgName: 'Birmingham Quran Academy',
        amount: 98,
        failureDate: '2024-12-05',
        reason: 'Insufficient funds',
        retryCount: 2,
        nextRetry: '2024-12-08',
        status: 'pending_retry'
      },
      {
        id: 'fp-002',
        orgName: 'Leeds Islamic School',
        amount: 76,
        failureDate: '2024-12-04',
        reason: 'Card declined',
        retryCount: 1,
        nextRetry: '2024-12-07',
        status: 'pending_retry'
      },
      {
        id: 'fp-003',
        orgName: 'Sheffield Islamic Centre',
        amount: 45,
        failureDate: '2024-12-03',
        reason: 'Expired card',
        retryCount: 3,
        nextRetry: 'Manual contact required',
        status: 'manual_review'
      }
    ],
    
    // Top revenue generators
    topRevenueGenerators: [
      { orgName: 'Leicester Islamic Centre', students: 156, monthlyRevenue: 156, growth: 12.5 },
      { orgName: 'Manchester Islamic School', students: 134, monthlyRevenue: 134, growth: 8.2 },
      { orgName: 'Birmingham Quran Academy', students: 98, monthlyRevenue: 98, growth: 15.3 },
      { orgName: 'London Islamic Centre', students: 87, monthlyRevenue: 87, growth: -2.1 },
      { orgName: 'Bradford Islamic School', students: 76, monthlyRevenue: 76, growth: 5.7 }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Revenue Management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Monitor and manage your platform's revenue streams and payment processing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{revenueData.current.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.4%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{revenueData.current.arr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Projected annual revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.paymentStatus.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData.current.failedPayments}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown and Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Current month revenue composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Subscription Revenue</span>
                </div>
                <span className="font-medium">£{revenueData.breakdown.subscriptionRevenue}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">One-time Payments</span>
                </div>
                <span className="font-medium">£{revenueData.breakdown.oneTimePayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">Refunds</span>
                </div>
                <span className="font-medium text-red-600">-£{revenueData.breakdown.refunds}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium">Chargebacks</span>
                </div>
                <span className="font-medium text-red-600">-£{revenueData.breakdown.chargebacks}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Revenue</span>
                  <span className="font-bold text-lg">£{revenueData.breakdown.netRevenue}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Overview</CardTitle>
            <CardDescription>Current month payment processing status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Successful</span>
                </div>
                <Badge variant="outline" className="text-green-600">{revenueData.paymentStatus.successful}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <Badge variant="outline" className="text-yellow-600">{revenueData.paymentStatus.pending}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Failed</span>
                </div>
                <Badge variant="outline" className="text-red-600">{revenueData.paymentStatus.failed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Refunded</span>
                </div>
                <Badge variant="outline" className="text-orange-600">{revenueData.paymentStatus.refunded}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Payments Requiring Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Failed Payments Requiring Attention</span>
          </CardTitle>
          <CardDescription>Payments that failed and need manual intervention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueData.failedPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{payment.orgName}</p>
                      <p className="text-sm text-gray-500">Failed on {payment.failureDate}</p>
                    </div>
                    <Badge variant={payment.status === 'manual_review' ? 'destructive' : 'secondary'}>
                      {payment.status === 'manual_review' ? 'Manual Review' : 'Pending Retry'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Reason: {payment.reason} • Retry count: {payment.retryCount}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-medium">£{payment.amount}</p>
                    <p className="text-sm text-gray-500">Next retry: {payment.nextRetry}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Revenue Generators */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Generators</CardTitle>
          <CardDescription>Organizations contributing the most to your revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueData.topRevenueGenerators.map((org, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{org.orgName}</p>
                    <p className="text-sm text-gray-500">{org.students} students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{org.monthlyRevenue}</p>
                  <div className="flex items-center">
                    {org.growth > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={`text-xs ${org.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {org.growth > 0 ? '+' : ''}{org.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

