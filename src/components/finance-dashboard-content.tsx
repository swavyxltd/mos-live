'use client'

import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import GenerateReportModal from '@/components/generate-report-modal'
import { RecentActivityModal } from '@/components/recent-activity-modal'
import { useState, useEffect } from 'react'
import { StatCardSkeleton, CardSkeleton } from '@/components/loading/skeleton'
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  Eye,
  FileText,
  Receipt,
  Banknote,
  PieChart
} from 'lucide-react'

export interface FinanceStats {
  totalStudents: number
  monthlyRevenue: number
  pendingInvoices: number
  overduePayments: number
  paidThisMonth: number
  totalOutstanding: number
  averagePaymentTime: number
  collectionRate: number
  studentGrowth?: number
  revenueGrowth?: number
  paidGrowth?: number
  pendingGrowth?: number
  overdueGrowth?: number
}

interface FinanceDashboardContentProps {
  initialStats: FinanceStats | null
}

const defaultStats: FinanceStats = {
  totalStudents: 0,
  monthlyRevenue: 0,
  pendingInvoices: 0,
  overduePayments: 0,
  paidThisMonth: 0,
  totalOutstanding: 0,
  averagePaymentTime: 0,
  collectionRate: 0,
  studentGrowth: 0,
  revenueGrowth: 0,
  paidGrowth: 0,
  pendingGrowth: 0,
  overdueGrowth: 0
}

export function FinanceDashboardContent({ initialStats }: FinanceDashboardContentProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [loading, setLoading] = useState(!initialStats)
  const [stats, setStats] = useState<FinanceStats>(initialStats ?? defaultStats)
  const [recentFinancialActivity, setRecentFinancialActivity] = useState<any[]>([])
  const [allRevenueClasses, setAllRevenueClasses] = useState<any[]>([])

  useEffect(() => {
    if (!initialStats) {
      fetchFinanceStats()
    } else {
      setLoading(false)
    }

    // Fetch dynamic sections
    fetchRecentFinancialActivity()
    fetchRevenueClasses()

    // Listen for refresh events
    const handleRefresh = () => {
      fetchFinanceStats()
      fetchRecentFinancialActivity()
      fetchRevenueClasses()
    }

    window.addEventListener('refresh-dashboard', handleRefresh)
    
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh)
    }
  }, [initialStats])

  const fetchFinanceStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        
        // Get outstanding invoices total
        const outstandingResponse = await fetch('/api/invoices?status=PENDING')
        let totalOutstanding = 0
        if (outstandingResponse.ok) {
          const invoices = await outstandingResponse.json()
          totalOutstanding = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.amountP || 0) / 100), 0)
        }

        // Calculate collection rate (paid invoices / total invoices)
        const totalInvoices = (data.paidThisMonth || 0) + (data.pendingInvoices || 0) + (data.overduePayments || 0)
        const collectionRate = totalInvoices > 0 
          ? (((data.paidThisMonth || 0) / totalInvoices) * 100)
          : 0

        // Calculate growth percentages (comparing to previous period)
        const now = new Date()
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthStr = lastMonth.toISOString().substring(0, 7)

        // Fetch previous month payment records for growth calculations
        let paidGrowth = 0
        let pendingGrowth = 0
        let overdueGrowth = 0

        try {
          const prevMonthResponse = await fetch(`/api/payments/records?month=${lastMonthStr}`)
          if (prevMonthResponse.ok) {
            const prevMonthData = await prevMonthResponse.json()
            const prevPaid = prevMonthData.filter((r: any) => r.status === 'PAID').length
            const prevPending = prevMonthData.filter((r: any) => r.status === 'PENDING').length
            const prevOverdue = prevMonthData.filter((r: any) => r.status === 'OVERDUE' || r.status === 'LATE').length

            const currentPaid = data.paidThisMonth || 0
            const currentPending = data.pendingInvoices || 0
            const currentOverdue = data.overduePayments || 0

            paidGrowth = prevPaid > 0 ? ((currentPaid - prevPaid) / prevPaid) * 100 : (currentPaid > 0 && prevPaid === 0 ? 100 : 0)
            pendingGrowth = prevPending > 0 ? ((currentPending - prevPending) / prevPending) * 100 : (currentPending > 0 && prevPending === 0 ? 100 : 0)
            overdueGrowth = prevOverdue > 0 ? ((currentOverdue - prevOverdue) / prevOverdue) * 100 : (currentOverdue > 0 && prevOverdue === 0 ? 100 : 0)
          }
        } catch (error) {
          // If we can't fetch previous month data, growth will remain 0
        }

        setStats({
          totalStudents: data.totalStudents || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          pendingInvoices: data.pendingInvoices || 0,
          overduePayments: data.overduePayments || 0,
          paidThisMonth: data.paidThisMonth || 0,
          totalOutstanding,
          averagePaymentTime: data.averagePaymentTime || 0,
          collectionRate: Number(collectionRate.toFixed(1)),
          studentGrowth: data.studentGrowth || 0,
          revenueGrowth: data.revenueGrowth || 0,
          paidGrowth,
          pendingGrowth,
          overdueGrowth
        })
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentFinancialActivity = async () => {
    try {
      // Fetch recent payments and invoices
      const [paymentsResponse, invoicesResponse] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/invoices')
      ])

      const activities: any[] = []

      if (paymentsResponse.ok) {
        const payments = await paymentsResponse.json()
        // Filter for paid payments and take most recent
        const paidPayments = payments
          .filter((p: any) => p.status === 'PAID' && p.paidDate)
          .sort((a: any, b: any) => new Date(b.paidDate || b.createdAt).getTime() - new Date(a.paidDate || a.createdAt).getTime())
          .slice(0, 5)
        
        paidPayments.forEach((payment: any) => {
          activities.push({
            id: payment.id,
            type: 'payment',
            action: `Payment received from ${payment.studentName || 'Student'}`,
            amount: `£${payment.amount?.toFixed(2) || '0.00'}`,
            timestamp: new Date(payment.paidDate || payment.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            time: new Date(payment.paidDate || payment.createdAt)
          })
        })
      }

      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json()
        // Get recent pending/overdue invoices
        const recentInvoices = invoices
          .filter((inv: any) => inv.status === 'PENDING' || inv.status === 'OVERDUE')
          .sort((a: any, b: any) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime())
          .slice(0, 5)
        
        recentInvoices.forEach((invoice: any) => {
          activities.push({
            id: invoice.id,
            type: invoice.status === 'OVERDUE' ? 'reminder' : 'invoice',
            action: `Invoice ${invoice.status === 'OVERDUE' ? 'overdue' : 'issued'} for ${invoice.studentName || 'Student'}`,
            amount: `£${invoice.amount?.toFixed(2) || '0.00'}`,
            timestamp: new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            time: new Date(invoice.dueDate || invoice.createdAt)
          })
        })
      }

      // Sort by timestamp (most recent first) and limit to 10
      activities.sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
      setRecentFinancialActivity(activities.slice(0, 10))
    } catch (error) {
      setRecentFinancialActivity([])
    }
  }

  const fetchRevenueClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const classes = await response.json()
        
        const revenueClasses = classes
          .filter((cls: any) => cls._count?.StudentClass > 0)
          .map((cls: any) => {
            const monthlyFee = cls.monthlyFeeP ? Number(cls.monthlyFeeP) / 100 : 0
            const studentCount = cls._count?.StudentClass || 0
            const revenue = monthlyFee * studentCount
            
            return {
              id: cls.id,
              name: cls.name,
              students: studentCount,
              avgFee: monthlyFee.toFixed(2),
              revenue: revenue.toFixed(2)
            }
          })
          .sort((a: any, b: any) => parseFloat(b.revenue) - parseFloat(a.revenue))
        
        setAllRevenueClasses(revenueClasses)
      } else {
        setAllRevenueClasses([])
      }
    } catch (error) {
      setAllRevenueClasses([])
    }
  }

  const {
    totalStudents,
    monthlyRevenue,
    pendingInvoices,
    overduePayments,
    paidThisMonth,
    totalOutstanding,
    averagePaymentTime,
    collectionRate,
    studentGrowth,
    revenueGrowth,
    paidGrowth,
    pendingGrowth,
    overdueGrowth
  } = stats

  // Handle CSV export generation with month/year filters
  const handleGenerateReport = async (month: number, year: number) => {
    try {
      // Calculate start and end dates for the selected month
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const response = await fetch('/api/reports/payments-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          startDate,
          endDate,
          month,
          year
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `payment-report-${year}-${String(month + 1).padStart(2, '0')}.csv`
        
        // Create download link for CSV
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        
        // Clean up
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        alert(`Failed to generate CSV report: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`Error generating CSV report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  // Show skeleton loaders while data is loading
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-[var(--muted)]/80 rounded-[var(--radius)] relative overflow-hidden">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-[shimmer_1.6s_infinite] motion-reduce:hidden" />
            </div>
            <div className="h-4 w-96 bg-[var(--muted)]/80 rounded-[var(--radius)] relative overflow-hidden">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-[shimmer_1.6s_infinite] motion-reduce:hidden" />
            </div>
          </div>
          <div className="h-10 w-40 bg-[var(--muted)]/80 rounded-[var(--radius)] relative overflow-hidden">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent motion-safe:animate-[shimmer_1.6s_infinite] motion-reduce:hidden" />
          </div>
        </div>

        {/* Financial Metrics Grid Skeleton */}
        <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Recent Financial Activity Skeleton */}
        <CardSkeleton className="h-64" />

        {/* All Revenue Classes Skeleton */}
        <CardSkeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Financial insights and payment management for your Islamic education center</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm"
            className="px-3 sm:px-4 py-2 text-sm hover:bg-gray-50 hover:scale-105 transition-all duration-200"
            onClick={() => setIsReportModalOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export Payment CSV
          </Button>
        </div>
      </div>

      {/* Financial Metrics Grid - Moved to top */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
        <Link href="/students" className="block">
          <StatCard
            title="Total Students"
            value={totalStudents}
            change={studentGrowth && studentGrowth !== 0 ? { 
              value: `${studentGrowth > 0 ? '+' : ''}${studentGrowth.toFixed(1)}%`, 
              type: studentGrowth > 0 ? "positive" : "negative" 
            } : undefined}
            description="Active enrollments"
            icon={<Users className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Monthly Revenue"
            value={`£${monthlyRevenue.toLocaleString()}`}
            change={revenueGrowth && revenueGrowth !== 0 ? { 
              value: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`, 
              type: revenueGrowth > 0 ? "positive" : "negative" 
            } : undefined}
            description="Recurring revenue"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Paid This Month"
            value={paidThisMonth}
            change={paidGrowth && paidGrowth !== 0 ? { 
              value: `${paidGrowth > 0 ? '+' : ''}${paidGrowth.toFixed(1)}%`, 
              type: paidGrowth > 0 ? "positive" : "negative" 
            } : undefined}
            description="Successful payments"
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Pending Invoices"
            value={pendingInvoices}
            change={pendingGrowth && pendingGrowth !== 0 ? { 
              value: `${pendingGrowth > 0 ? '+' : ''}${pendingGrowth.toFixed(1)}%`, 
              type: pendingGrowth > 0 ? "negative" : "positive" 
            } : undefined}
            description="Awaiting payment"
            detail={`£${totalOutstanding.toLocaleString()} total value`}
            icon={<Receipt className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Overdue Payments"
            value={overduePayments}
            change={overdueGrowth && overdueGrowth !== 0 ? { 
              value: `${overdueGrowth > 0 ? '+' : ''}${overdueGrowth.toFixed(1)}%`, 
              type: overdueGrowth > 0 ? "negative" : "positive" 
            } : undefined}
            description="Past due amounts"
            detail="Urgent attention needed"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Total Outstanding"
            value={`£${totalOutstanding.toLocaleString()}`}
            description="Unpaid amounts"
            detail="Across all students"
            icon={<Clock className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Avg Payment Time"
            value={averagePaymentTime > 0 ? `${averagePaymentTime.toFixed(1)} days` : 'N/A'}
            description="From invoice to payment"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Collection Rate"
            value={`${collectionRate}%`}
            description="Payment success rate"
            icon={<PieChart className="h-4 w-4" />}
          />
        </Link>
      </div>

      {/* Recent Financial Activity */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Financial Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentFinancialActivity.length > 0 ? (
            <>
              <div className="space-y-4">
                {recentFinancialActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'payment' ? 'bg-green-500' :
                      activity.type === 'invoice' ? 'bg-blue-500' :
                      activity.type === 'reminder' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {activity.amount}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsActivityModalOpen(true)
                  }}
                  className="w-full hover:bg-gray-50"
                >
                  Show More ({recentFinancialActivity.length} total)
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent financial activity</p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* All Revenue Classes */}
      <Link href="/fees" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              All Revenue Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allRevenueClasses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Avg Fee</TableHead>
                      <TableHead>Monthly Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRevenueClasses.map((classItem, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{classItem.name}</TableCell>
                        <TableCell>{classItem.students}</TableCell>
                        <TableCell>£{classItem.avgFee}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(classItem.revenue / Math.max(...allRevenueClasses.map(c => c.revenue))) * 100}%` }}
                            />
                          </div>
                            <span className="text-sm font-medium">£{classItem.revenue}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No revenue classes available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerateReport={handleGenerateReport}
      />

      {/* Recent Activity Modal */}
      <RecentActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        activities={recentFinancialActivity}
      />
    </div>
  )
}
