'use client'

import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { QuickAddMenu } from '@/components/quick-add-menu'
import { RestrictedAction } from '@/components/restricted-action'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Lazy load modals to reduce initial bundle size
const GenerateReportModal = dynamic(() => import('@/components/generate-report-modal'), {
  ssr: false,
})
const AddStudentModal = dynamic(() => import('@/components/add-student-modal').then(mod => ({ default: mod.AddStudentModal })), {
  ssr: false,
})
const AddTeacherModal = dynamic(() => import('@/components/add-teacher-modal').then(mod => ({ default: mod.AddTeacherModal })), {
  ssr: false,
})
const AddClassModal = dynamic(() => import('@/components/add-class-modal').then(mod => ({ default: mod.AddClassModal })), {
  ssr: false,
})
const ActivityModal = dynamic(() => import('@/components/activity-modal').then(mod => ({ default: mod.ActivityModal })), {
  ssr: false,
})

// Lazy load WaveChart to reduce initial bundle size
const WaveChart = dynamic(() => import('@/components/ui/wave-chart').then(mod => ({ default: mod.WaveChart })), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <div className="h-full w-full bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
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
  MessageSquare
} from 'lucide-react'
import type { DashboardStats as DashboardStatsType } from '@/lib/dashboard-stats'

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
  paidThisMonth?: number
  averagePaymentTime?: number
}

interface DashboardContentProps {
  initialStats?: DashboardStatsType | null
}

export function DashboardContent({ initialStats }: DashboardContentProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false)
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade: string }>>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [topPerformingClasses, setTopPerformingClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(!initialStats) // Only loading if no initial stats
  const [stats, setStats] = useState<DashboardStats>(
    initialStats || {
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
    }
  )

  useEffect(() => {
    // Only fetch if we don't have initial stats
    if (!initialStats) {
      fetchDashboardStats()
    }
    
    // Fetch classes for AddStudentModal
    fetchClasses()
    
    // Fetch dynamic dashboard sections
    fetchRecentActivity()
    fetchUpcomingEvents()
    fetchTopPerformingClasses()
    
    // Listen for refresh events
    const handleRefresh = () => {
      fetchDashboardStats()
      fetchClasses()
      fetchRecentActivity()
      fetchUpcomingEvents()
      fetchTopPerformingClasses()
    }
    
    window.addEventListener('refresh-dashboard', handleRefresh)
    
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh)
    }
  }, [initialStats])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const data = await response.json()
        const classList = data.classes?.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          grade: cls.grade || ''
        })) || []
        setClasses(classList)
      }
    } catch (error) {
      // Error fetching classes
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent activity from audit logs (admin/staff only)
      const response = await fetch('/api/activity?page=1&limit=3')
      if (response.ok) {
        const data = await response.json()
        const logs = data.logs || []
        
        // Format for display - only show latest 3
        const activities = logs.slice(0, 3).map((log: any) => ({
          id: log.id,
          type: log.action.toLowerCase().includes('payment') ? 'payment' :
                log.action.toLowerCase().includes('student') ? 'enrollment' :
                log.action.toLowerCase().includes('message') ? 'message' :
                log.action.toLowerCase().includes('attendance') ? 'attendance' : 'activity',
          action: log.actionText,
          user: log.user?.name || log.user?.email || 'System',
          timestamp: log.timestamp,
          time: log.createdAt
        }))
        
        setRecentActivity(activities)
      } else {
        setRecentActivity([])
      }
    } catch (error) {
      setRecentActivity([])
    }
  }

  const fetchUpcomingEvents = async () => {
    try {
      const now = new Date()
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      const response = await fetch(`/api/events?startDate=${now.toISOString()}&endDate=${next30Days.toISOString()}`)
      if (response.ok) {
        const events = await response.json()
        const upcoming = events
          .filter((event: any) => {
            const eventDate = new Date(event.date)
            return eventDate >= now && eventDate <= next30Days
          })
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5)
          .map((event: any) => ({
            id: event.id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString(),
            description: event.description || event.Class?.name || '',
            type: event.type || 'event'
          }))
        setUpcomingEvents(upcoming)
      } else {
        setUpcomingEvents([])
      }
    } catch (error) {
      setUpcomingEvents([])
    }
  }

  const fetchTopPerformingClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (response.ok) {
        const classesData = await response.json()
        const classes = classesData.classes || classesData || []
        
        // Get classes with student counts and basic info
        const classesWithInfo = classes
          .filter((cls: any) => cls._count?.StudentClass > 0)
          .map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            teacher: cls.User?.name || cls.User?.email || 'Unassigned',
            students: cls._count?.StudentClass || 0,
            attendance: 95 // Default attendance - can be calculated from actual data later
          }))
          .sort((a: any, b: any) => b.students - a.students) // Sort by student count
          .slice(0, 5)
        
        setTopPerformingClasses(classesWithInfo)
      } else {
        setTopPerformingClasses([])
      }
    } catch (error) {
      setTopPerformingClasses([])
    }
  }

  const fetchDashboardStats = async () => {
    try {
      // Use cache headers for better performance
      const response = await fetch('/api/dashboard/stats', {
        cache: 'default',
        headers: {
          'Cache-Control': 'max-age=60'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
                  } else {
                    // Set default stats to prevent UI errors
        setStats({
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
          attendanceTrend: [],
          paidThisMonth: 0,
          averagePaymentTime: 0
                })
              }
            } catch (error) {
              // Set default stats to prevent UI errors
      setStats({
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
        attendanceTrend: [],
        paidThisMonth: 0,
        averagePaymentTime: 0
      })
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

  // Loading state is handled by loading.tsx file
  
  // Handle filter changes
  const handleFilterChange = (filter: string) => {
    // Filter change handler
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
                    alert(`Failed to generate report: ${errorData.details || errorData.error}`)
                  }
                } catch (error) {
                  alert(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
  }
  
  // Use real attendance trend data from API (no fallback demo data)
  const attendanceData = attendanceTrend

  return (
    <div className="space-y-6">
          {/* Header with Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Madrasah Overview</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights into your Islamic education center</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <QuickAddMenu 
            onAddStudent={() => setIsAddStudentModalOpen(true)}
            onAddTeacher={() => setIsAddTeacherModalOpen(true)}
            onAddClass={() => setIsAddClassModalOpen(true)}
          />
          <RestrictedAction action="reports">
            <Button 
              variant="outline" 
              size="sm"
              className="px-3 sm:px-4 py-2 text-sm hover:bg-gray-50 hover:scale-105 transition-all duration-200"
              onClick={() => setIsReportModalOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </RestrictedAction>
        </div>
      </div>

      {/* All Metrics in Uniform Grid */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4 auto-rows-fr">
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
        <Link href="/staff" className="block">
          <StatCard
            title="Staff Members"
            value={staffMembers}
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
        <div className="lg:col-span-2 flex">
          <Card className="hover:shadow-md transition-shadow cursor-pointer flex flex-col w-full" onClick={() => setIsActivityModalOpen(true)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'enrollment' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200' :
                        activity.type === 'payment' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200' :
                        activity.type === 'attendance' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200' :
                        activity.type === 'message' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {activity.type === 'enrollment' ? <Users className="h-4 w-4" /> :
                         activity.type === 'payment' ? <DollarSign className="h-4 w-4" /> :
                         activity.type === 'attendance' ? <UserCheck className="h-4 w-4" /> :
                         activity.type === 'message' ? <MessageSquare className="h-4 w-4" /> :
                         <Activity className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {activity.user}
                        </p>
                        <p className="text-sm text-[var(--foreground)] mt-0.5">
                          {activity.action}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--muted-foreground)]">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Link href="/calendar" className="block flex">
          <Card className="hover:shadow-md transition-shadow cursor-pointer flex flex-col w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
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

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSave={() => {
          setIsAddStudentModalOpen(false)
          fetchDashboardStats()
        }}
        classes={classes}
      />

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddTeacherModalOpen}
        onClose={() => setIsAddTeacherModalOpen(false)}
        onSave={() => {
          setIsAddTeacherModalOpen(false)
          fetchDashboardStats()
        }}
      />

      {/* Add Class Modal */}
      <AddClassModal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        onSave={() => {
          setIsAddClassModalOpen(false)
          fetchDashboardStats()
          fetchClasses()
        }}
      />

      {/* Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </div>
  )
}
