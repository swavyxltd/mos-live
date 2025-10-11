'use client'

import { StatCard } from '@/components/ui/stat-card'
import { WaveChart } from '@/components/ui/wave-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import GenerateReportModal from '@/components/generate-report-modal'
import { useState } from 'react'
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
  PieChart,
  Calendar
} from 'lucide-react'

export function FinanceDashboardContent() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  
  // Finance-focused demo data
  const totalStudents = 47
  const monthlyRevenue = 2840
  const pendingInvoices = 12
  const overduePayments = 3
  const paidThisMonth = 35
  const totalOutstanding = 1250
  const averagePaymentTime = 8.5
  const collectionRate = 94.2
  
  // Handle filter changes
  const handleFilterChange = (filter: string) => {
    console.log('Filter changed to:', filter)
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
  
  // Finance-focused chart data (revenue over time)
  const revenueData = [
    // Last 7 days
    { date: '2025-10-01', value: 120 },
    { date: '2025-10-02', value: 180 },
    { date: '2025-10-03', value: 95 },
    { date: '2025-10-04', value: 220 },
    { date: '2025-10-05', value: 150 },
    { date: '2025-10-06', value: 200 },
    { date: '2025-10-07', value: 175 },
    
    // Last 30 days
    { date: '2025-09-01', value: 160 },
    { date: '2025-09-02', value: 140 },
    { date: '2025-09-03', value: 190 },
    { date: '2025-09-04', value: 130 },
    { date: '2025-09-05', value: 210 },
    { date: '2025-09-06', value: 170 },
    { date: '2025-09-07', value: 185 },
    { date: '2025-09-08', value: 155 },
    { date: '2025-09-09', value: 200 },
    { date: '2025-09-10', value: 145 },
    { date: '2025-09-11', value: 180 },
    { date: '2025-09-12', value: 165 },
    { date: '2025-09-13', value: 195 },
    { date: '2025-09-14', value: 125 },
    { date: '2025-09-15', value: 175 },
    { date: '2025-09-16', value: 205 },
    { date: '2025-09-17', value: 135 },
    { date: '2025-09-18', value: 185 },
    { date: '2025-09-19', value: 150 },
    { date: '2025-09-20', value: 195 },
    { date: '2025-09-21', value: 140 },
    { date: '2025-09-22', value: 180 },
    { date: '2025-09-23', value: 160 },
    { date: '2025-09-24', value: 190 },
    { date: '2025-09-25', value: 145 },
    { date: '2025-09-26', value: 175 },
    { date: '2025-09-27', value: 200 },
    { date: '2025-09-28', value: 130 },
    { date: '2025-09-29', value: 185 },
    { date: '2025-09-30', value: 155 }
  ]
  
  const recentFinancialActivity = [
    {
      action: 'Payment received - £50 from Mohammed Ali',
      timestamp: '2 hours ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00'
    },
    {
      action: 'Invoice generated - Aisha Khan (Quran Level 1)',
      timestamp: '4 hours ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'invoice',
      amount: '£75.00'
    },
    {
      action: 'Overdue payment reminder sent - Fatima Ali',
      timestamp: '6 hours ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'reminder',
      amount: '£100.00'
    },
    {
      action: 'Cash payment recorded - Yusuf Patel',
      timestamp: '1 day ago',
      user: { name: 'Hassan Ali', email: 'hassan@madrasah.com' },
      type: 'cash_payment',
      amount: '£25.00'
    }
  ]
  
  const upcomingFinancialEvents = [
    {
      title: 'Monthly Fee Collection',
      date: 'Dec 15, 2024',
      type: 'collection',
      description: 'Due date for December fees'
    },
    {
      title: 'Quarterly Financial Review',
      date: 'Dec 20, 2024',
      type: 'review',
      description: 'Q4 financial assessment'
    },
    {
      title: 'Year-end Financial Report',
      date: 'Dec 31, 2024',
      type: 'report',
      description: 'Annual financial summary'
    }
  ]
  
  const topRevenueClasses = [
    { name: 'Quran Recitation - Level 1', revenue: 450, students: 12, avgFee: 37.50 },
    { name: 'Islamic Studies - Level 2', revenue: 320, students: 8, avgFee: 40.00 },
    { name: 'Arabic Grammar', revenue: 375, students: 15, avgFee: 25.00 }
  ]

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

      {/* Financial Metrics Grid */}
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

      {/* Revenue Trend Chart */}
      <div className="hover:shadow-md transition-shadow cursor-pointer">
        <WaveChart 
          title="Daily Revenue Trend"
          subtitle="Daily payment collections over the last 2 weeks"
          data={revenueData}
          filterOptions={[
            { label: '7D', value: '7d' },
            { label: '30D', value: '30d', active: true },
            { label: '90D', value: '90d' }
          ]}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Financial Activity */}
        <Link href="/payments" className="block lg:col-span-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Financial Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentFinancialActivity.map((activity, index) => (
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
            </CardContent>
          </Card>
        </Link>

        {/* Upcoming Financial Events */}
        <Link href="/calendar" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Financial Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingFinancialEvents.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      event.type === 'collection' ? 'bg-green-500' :
                      event.type === 'review' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Revenue Classes */}
      <Link href="/fees" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                Top Revenue Classes
              </CardTitle>
              <Button variant="outline" size="sm" className="px-2 sm:px-3 py-1 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Avg Fee</TableHead>
                    <TableHead>Monthly Revenue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRevenueClasses.map((classItem, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>{classItem.students}</TableCell>
                      <TableCell>£{classItem.avgFee}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(classItem.revenue / 500) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">£{classItem.revenue}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          High Revenue
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onGenerateReport={handleGenerateReport}
      />
    </div>
  )
}
