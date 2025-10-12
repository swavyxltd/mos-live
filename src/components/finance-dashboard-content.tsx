'use client'

import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import GenerateReportModal from '@/components/generate-report-modal'
import { RecentActivityModal } from '@/components/recent-activity-modal'
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
  PieChart
} from 'lucide-react'

export function FinanceDashboardContent() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  
  // Finance-focused demo data
  const totalStudents = 47
  const monthlyRevenue = 2840
  const pendingInvoices = 12
  const overduePayments = 3
  const paidThisMonth = 35
  const totalOutstanding = 1250
  const averagePaymentTime = 8.5
  const collectionRate = 94.2
  

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
  
  
  const recentFinancialActivity = [
    {
      action: 'Payment received - £50 from Mohammed Ali',
      timestamp: '2 hours ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Ahmed Hassan',
      class: 'Quran Recitation - Level 1',
      paymentMethod: 'Bank Transfer'
    },
    {
      action: 'Invoice generated - Aisha Khan (Quran Level 1)',
      timestamp: '4 hours ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'invoice',
      amount: '£50.00',
      studentName: 'Aisha Khan',
      class: 'Quran Recitation - Level 1'
    },
    {
      action: 'Overdue payment reminder sent - Fatima Ali',
      timestamp: '6 hours ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'reminder',
      amount: '£100.00', // Combined for 2 children
      studentName: 'Fatima Ali',
      class: 'Islamic Studies - Level 2'
    },
    {
      action: 'Cash payment recorded - Yusuf Patel',
      timestamp: '1 day ago',
      user: { name: 'Hassan Ali', email: 'hassan@madrasah.com' },
      type: 'cash_payment',
      amount: '£25.00',
      studentName: 'Yusuf Patel',
      class: 'Arabic Grammar',
      paymentMethod: 'Cash'
    },
    {
      action: 'Payment received - £50 from Sarah Khan',
      timestamp: '1 day ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Aisha Khan',
      class: 'Quran Recitation - Level 1',
      paymentMethod: 'Card Payment'
    },
    {
      action: 'Invoice generated - Omar Ahmed (Islamic Studies)',
      timestamp: '2 days ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'invoice',
      amount: '£50.00',
      studentName: 'Omar Ahmed',
      class: 'Islamic Studies - Level 2'
    },
    {
      action: 'Payment received - £50 from Fatima Ali',
      timestamp: '2 days ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Maryam Ali',
      class: 'Arabic Grammar',
      paymentMethod: 'Bank Transfer'
    },
    {
      action: 'Cash payment recorded - Ahmed Patel',
      timestamp: '3 days ago',
      user: { name: 'Hassan Ali', email: 'hassan@madrasah.com' },
      type: 'cash_payment',
      amount: '£50.00',
      studentName: 'Zainab Patel',
      class: 'Islamic Studies - Level 2',
      paymentMethod: 'Cash'
    },
    {
      action: 'Overdue payment reminder sent - Mohammed Khan',
      timestamp: '3 days ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'reminder',
      amount: '£50.00',
      studentName: 'Ibrahim Khan',
      class: 'Quran Recitation - Level 1'
    },
    {
      action: 'Payment received - £50 from Hassan Ali',
      timestamp: '4 days ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Hassan Ali',
      class: 'Quran Recitation - Level 1',
      paymentMethod: 'Bank Transfer'
    },
    {
      action: 'Invoice generated - Amina Khan (Islamic Studies)',
      timestamp: '4 days ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'invoice',
      amount: '£50.00',
      studentName: 'Amina Khan',
      class: 'Islamic Studies - Level 2'
    },
    {
      action: 'Payment received - £50 from Omar Ahmed',
      timestamp: '5 days ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Khalid Ahmed',
      class: 'Arabic Grammar',
      paymentMethod: 'Card Payment'
    },
    {
      action: 'Cash payment recorded - Priya Patel',
      timestamp: '5 days ago',
      user: { name: 'Hassan Ali', email: 'hassan@madrasah.com' },
      type: 'cash_payment',
      amount: '£50.00',
      studentName: 'Layla Patel',
      class: 'Quran Recitation - Level 1',
      paymentMethod: 'Cash'
    },
    {
      action: 'Overdue payment reminder sent - Mohammed Ali',
      timestamp: '6 days ago',
      user: { name: 'Finance System', email: 'finance@madrasah.com' },
      type: 'reminder',
      amount: '£50.00',
      studentName: 'Ahmed Hassan',
      class: 'Quran Recitation - Level 1'
    },
    {
      action: 'Payment received - £40 from Sarah Khan',
      timestamp: '1 week ago',
      user: { name: 'System', email: 'system@madrasah.com' },
      type: 'payment',
      amount: '£50.00',
      studentName: 'Aisha Khan',
      class: 'Quran Recitation - Level 1',
      paymentMethod: 'Bank Transfer'
    }
  ]
  
  
  const allRevenueClasses = [
    { name: 'Quran Recitation - Level 1', revenue: 450, students: 12, avgFee: 37.50 },
    { name: 'Islamic Studies - Level 2', revenue: 320, students: 8, avgFee: 40.00 },
    { name: 'Arabic Grammar', revenue: 375, students: 15, avgFee: 25.00 },
    { name: 'Quran Recitation - Level 2', revenue: 280, students: 7, avgFee: 40.00 },
    { name: 'Islamic Studies - Level 1', revenue: 240, students: 6, avgFee: 40.00 },
    { name: 'Arabic Conversation', revenue: 200, students: 10, avgFee: 20.00 },
    { name: 'Tajweed - Level 1', revenue: 180, students: 9, avgFee: 20.00 },
    { name: 'Islamic History', revenue: 160, students: 8, avgFee: 20.00 },
    { name: 'Fiqh - Level 1', revenue: 140, students: 7, avgFee: 20.00 },
    { name: 'Hadith Studies', revenue: 120, students: 6, avgFee: 20.00 }
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
