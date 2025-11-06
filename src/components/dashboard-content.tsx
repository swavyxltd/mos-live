'use client'

import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { QuickAddMenu } from '@/components/quick-add-menu'
import GenerateReportModal from '@/components/generate-report-modal'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Lazy load WaveChart to reduce initial bundle size
const WaveChart = dynamic(() => import('@/components/ui/wave-chart').then(mod => ({ default: mod.WaveChart })), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </CardContent>
    </Card>
  )
})
import { 
  Users, 
  BookOpen, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Activity,
  Eye,
  FileText,
  Loader2
} from 'lucide-react'

interface DashboardStats {
  totalStudents: number
  newStudentsThisMonth: number
  studentGrowth: number
  activeClasses: number
  staffMembers: number
  attendanceRate: number
  attendanceGrowth: number
  monthlyRevenue: number
  revenueGrowth: number
  pendingInvoices: number
  overduePayments: number
  pendingApplications: number
  attendanceTrend: Array<{ date: string; value: number }>
}

export function DashboardContent() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    newStudentsThisMonth: 0,
    studentGrowth: 0,
    activeClasses: 0,
    staffMembers: 0,
    attendanceRate: 0,
    attendanceGrowth: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    pendingInvoices: 0,
    overduePayments: 0,
    pendingApplications: 0,
    attendanceTrend: []
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const {
    totalStudents,
    newStudentsThisMonth,
    studentGrowth,
    activeClasses,
    staffMembers,
    attendanceRate,
    attendanceGrowth,
    monthlyRevenue,
    revenueGrowth,
    pendingInvoices,
    overduePayments,
    pendingApplications,
    attendanceTrend
  } = stats

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
  
  // Handle filter changes
  const handleFilterChange = (filter: string) => {
    console.log('Filter changed to:', filter)
    // You can add additional logic here if needed
  }

  // Handle report generation
  const handleGenerateReport = async (month: number, year: number) => {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month, year })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // Create download link for PDF
        const a = document.createElement('a')
        a.href = url
        a.download = `madrasah-report-${year}-${String(month + 1).padStart(2, '0')}.pdf`
        document.body.appendChild(a)
        a.click()
        
        // Clean up
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error('Failed to generate report:', errorData)
        alert(`Failed to generate report: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  // Use real attendance trend data from API (no fallback demo data)
  const attendanceData = attendanceTrend
  
  // Empty arrays - will be populated from real data when available
  const recentActivity: any[] = []
  const upcomingEvents: any[] = []
  const topPerformingClasses: any[] = []

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          {/* Header with Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Madrasah Overview</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights into your Islamic education center</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <QuickAddMenu />
          <Button 
            variant="outline" 
            size="sm"
            className="px-3 sm:px-4 py-2 text-sm hover:bg-gray-50 hover:scale-105 transition-all duration-200"
            onClick={() => setIsReportModalOpen(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* All Metrics in Uniform Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
        <Link href="/students" className="block">
          <StatCard
            title="Total Students"
            value={totalStudents}
            change={studentGrowth > 0 ? { value: `+${studentGrowth.toFixed(1)}%`, type: "positive" } : studentGrowth < 0 ? { value: `${studentGrowth.toFixed(1)}%`, type: "negative" } : undefined}
            description="Active enrollments"
            detail={newStudentsThisMonth > 0 ? `+${newStudentsThisMonth} new this month` : "No new students this month"}
            icon={<Users className="h-4 w-4" />}
          />
        </Link>
        <Link href="/invoices" className="block">
          <StatCard
            title="Monthly Revenue"
            value={`£${monthlyRevenue.toLocaleString()}`}
            change={revenueGrowth > 0 ? { value: `+${revenueGrowth.toFixed(1)}%`, type: "positive" } : revenueGrowth < 0 ? { value: `${revenueGrowth.toFixed(1)}%`, type: "negative" } : undefined}
            description="Recurring revenue"
            detail="MRR growth trend"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </Link>
        <Link href="/attendance" className="block">
          <StatCard
            title="This Week's Attendance"
            value={`${attendanceRate}%`}
            change={attendanceGrowth > 0 ? { value: `+${attendanceGrowth}%`, type: "positive" } : attendanceGrowth < 0 ? { value: `${attendanceGrowth}%`, type: "negative" } : undefined}
            description="Average attendance rate"
            detail={attendanceRate >= 85 ? "Above target of 85%" : "Below target of 85%"}
            icon={<UserCheck className="h-4 w-4" />}
          />
        </Link>
        <Link href="/classes" className="block">
          <StatCard
            title="Active Classes"
            value={activeClasses}
            description="Currently running"
            detail={`${staffMembers} staff members`}
            icon={<BookOpen className="h-4 w-4" />}
          />
        </Link>
        <Link href="/applications" className="block">
          <StatCard
            title="Pending Applications"
            value={pendingApplications}
            description="New student applications"
            detail="Review needed"
            icon={<FileText className="h-4 w-4" />}
          />
        </Link>
        <Link href="/invoices" className="block">
          <StatCard
            title="Overdue Payments"
            value={overduePayments}
            description="Past due amounts"
            detail="Urgent attention"
            icon={<Clock className="h-4 w-4" />}
          />
        </Link>
        <Link href="/students" className="block">
          <StatCard
            title="New Enrollments"
            value={newStudentsThisMonth}
            change={studentGrowth > 0 ? { value: "This month", type: "positive" } : undefined}
            description="Recent additions"
            detail="Growth indicator"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </Link>
        <Link href="/settings" className="block">
          <StatCard
            title="Staff Members"
            value={staffMembers}
            change={{ value: "Teachers & admin", type: "neutral" }}
            description="Team size"
            detail="Active personnel"
            icon={<UserCheck className="h-4 w-4" />}
          />
        </Link>
      </div>

      {/* Attendance Trend Chart */}
      <div className="hover:shadow-md transition-shadow cursor-pointer">
        <WaveChart 
          title="Attendance Trend"
          subtitle="Daily attendance over the last 2 weeks"
          data={attendanceData}
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
        {/* Recent Activity */}
        <Link href="/dashboard" className="block lg:col-span-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'enrollment' ? 'bg-green-500' :
                        activity.type === 'payment' ? 'bg-blue-500' :
                        activity.type === 'attendance' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Upcoming Events */}
        <Link href="/calendar" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        event.type === 'exam' ? 'bg-red-500' :
                        event.type === 'meeting' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Performing Classes */}
      <Link href="/classes" className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                    Top Performing Classes
                  </CardTitle>
                  <Button variant="outline" size="sm" className="px-2 sm:px-3 py-1 text-xs hover:bg-gray-50 hover:scale-105 transition-all duration-200">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
          <CardContent>
            {topPerformingClasses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPerformingClasses.map((classItem, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>{classItem.teacher}</TableCell>
                      <TableCell>{classItem.students}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${classItem.attendance}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{classItem.attendance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Excellent
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No classes available</p>
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
    </div>
  )
}
