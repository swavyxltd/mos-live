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
import { Loader2 } from 'lucide-react'
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

interface FinanceStats {
  totalStudents: number
  monthlyRevenue: number
  pendingInvoices: number
  overduePayments: number
  paidThisMonth: number
  totalOutstanding: number
  averagePaymentTime: number
  collectionRate: number
}

export function FinanceDashboardContent() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FinanceStats>({
    totalStudents: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    overduePayments: 0,
    paidThisMonth: 0,
    totalOutstanding: 0,
    averagePaymentTime: 0,
    collectionRate: 0
  })

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const fetchFinanceStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        
        // Calculate additional finance metrics
        const totalInvoices = data.pendingInvoices + (data.totalStudents || 0)
        const paidCount = data.totalStudents - data.pendingInvoices
        const collectionRate = data.totalStudents > 0 
          ? ((paidCount / data.totalStudents) * 100).toFixed(1)
          : 0

        // Get outstanding invoices total
        const outstandingResponse = await fetch('/api/invoices?status=PENDING')
        let totalOutstanding = 0
        if (outstandingResponse.ok) {
          const invoices = await outstandingResponse.json()
          totalOutstanding = invoices.reduce((sum: number, inv: any) => sum + (Number(inv.amountP || 0) / 100), 0)
        }

        setStats({
          totalStudents: data.totalStudents || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          pendingInvoices: data.pendingInvoices || 0,
          overduePayments: data.overduePayments || 0,
          paidThisMonth: paidCount,
          totalOutstanding,
          averagePaymentTime: 8.5, // TODO: Calculate from actual payment data
          collectionRate: Number(collectionRate)
        })
      } else {
        console.error('Failed to fetch finance stats')
      }
    } catch (error) {
      console.error('Error fetching finance stats:', error)
    } finally {
      setLoading(false)
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
    collectionRate
  } = stats

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  

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
        console.error('Failed to generate CSV report:', errorData)
        alert(`Failed to generate CSV report: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating CSV report:', error)
      alert(`Error generating CSV report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  
  // Empty arrays - will be populated from real data when available
  const recentFinancialActivity: any[] = []
  const allRevenueClasses: any[] = []

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
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
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
        <Link href="/students" className="block">
          <StatCard
            title="Total Students"
            value={totalStudents}
            change={{ value: "+12.5%", type: "positive" }}
            description="Active enrollments"
            detail="+5 new this month"
            icon={<Users className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Monthly Revenue"
            value={`£${monthlyRevenue.toLocaleString()}`}
            change={{ value: "+8.2%", type: "positive" }}
            description="Recurring revenue"
            detail="MRR growth trend"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Paid This Month"
            value={paidThisMonth}
            change={{ value: "+15%", type: "positive" }}
            description="Successful payments"
            detail="Out of 47 students"
            icon={<CheckCircle className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Pending Invoices"
            value={pendingInvoices}
            description="Awaiting payment"
            detail="£1,250 total value"
            icon={<Receipt className="h-4 w-4" />}
          />
        </Link>
        <Link href="/payments" className="block">
          <StatCard
            title="Overdue Payments"
            value={overduePayments}
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
            value={`${averagePaymentTime} days`}
            change={{ value: "-2 days", type: "positive" }}
            description="From invoice to payment"
            detail="Improving trend"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </Link>
        <Link href="/fees" className="block">
          <StatCard
            title="Collection Rate"
            value={`${collectionRate}%`}
            change={{ value: "+3.2%", type: "positive" }}
            description="Payment success rate"
            detail="Above target of 90%"
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
                    console.log('Show More button clicked')
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
