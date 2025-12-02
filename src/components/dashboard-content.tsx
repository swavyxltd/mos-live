'use client'

import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
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
  MessageSquare,
  ArrowRight,
  Send,
  Zap
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
  paidThisMonth?: number
  averagePaymentTime?: number
}

interface DashboardContentProps {
  initialStats?: DashboardStatsType | null
  userRole?: string | null
  staffSubrole?: string | null
  orgCreatedAt?: Date
}

export function DashboardContent({ initialStats, userRole, staffSubrole, orgCreatedAt }: DashboardContentProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false)
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false)
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade: string }>>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [topPerformingClasses, setTopPerformingClasses] = useState<any[]>([])
  const [todaysTasks, setTodaysTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
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
      pendingApplications: 0
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
    fetchTodaysTasks()
    
    // Listen for refresh events
    const handleRefresh = () => {
      fetchDashboardStats()
      fetchClasses()
      fetchRecentActivity()
      fetchUpcomingEvents()
      fetchTopPerformingClasses()
      fetchTodaysTasks()
    }
    
    window.addEventListener('refresh-dashboard', handleRefresh)
    
    // Auto-refresh tasks every 30 seconds to catch completed tasks
    const tasksInterval = setInterval(() => {
      fetchTodaysTasks()
    }, 30000) // 30 seconds
    
    // Also listen for page visibility changes to refresh when user returns
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTodaysTasks()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('refresh-dashboard', handleRefresh)
      clearInterval(tasksInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
            date: new Date(event.date),
            dateString: new Date(event.date).toLocaleDateString(),
            description: event.description || event.Class?.name || '',
            type: event.type || 'EVENT',
            isHoliday: event.isHoliday || false,
            endDate: event.endDate ? new Date(event.endDate) : null
          }))
        setUpcomingEvents(upcoming)
      } else {
        setUpcomingEvents([])
      }
    } catch (error) {
      setUpcomingEvents([])
    }
  }

  const fetchTodaysTasks = async () => {
    try {
      setLoadingTasks(true)
      const response = await fetch('/api/dashboard/today-tasks', {
        cache: 'no-store' // Always fetch fresh data
      })
      if (response.ok) {
        const data = await response.json()
        setTodaysTasks(data.tasks || [])
      }
    } catch (error) {
      // Error fetching tasks
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchTopPerformingClasses = async () => {
    try {
      const response = await fetch('/api/classes', {
        cache: 'no-store' // Always fetch fresh data
      })
      if (response.ok) {
        const classes = await response.json()
        // API returns array directly, not wrapped in classes property
        
        // Get classes with student counts and basic info
        const classesWithInfo = (Array.isArray(classes) ? classes : [])
          .filter((cls: any) => cls._count?.StudentClass > 0)
          .map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            teacher: cls.User?.name || cls.User?.email || 'Unassigned',
            students: cls._count?.StudentClass || 0,
            attendance: cls.attendance || 0 // Use calculated attendance from API
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
    pendingApplications
  } = stats

  // Loading state is handled by loading.tsx file

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
                    toast.error(`Failed to generate report: ${errorData.details || errorData.error}`)
                  }
                } catch (error) {
                  toast.error(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`)
                }
  }

  // Dashboard type is determined by subrole template, not individual permissions
  const isTeacher = staffSubrole === 'TEACHER'
  const isAdmin = userRole === 'ADMIN' || staffSubrole === 'ADMIN'

  // Quick action handlers
  const handleQuickAction = async (taskId: string, action: string) => {
    setQuickActionLoading(taskId)
    try {
      switch (taskId) {
        case 'applications':
          // Quick review - navigate to applications with NEW filter
          window.location.href = '/applications?status=NEW'
          break
        case 'overdue-payments':
          // Send reminder to all overdue payments
          const response = await fetch('/api/payments/send-reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: 'overdue' })
          })
          if (response.ok) {
            toast.success('Payment reminders sent successfully!')
            fetchTodaysTasks() // Refresh tasks
          } else {
            toast.error('Failed to send reminders. Please try again.')
          }
          break
        case 'pending-invoices':
          // Send all pending invoices
          const invoiceResponse = await fetch('/api/invoices/send-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PENDING' })
          })
          if (invoiceResponse.ok) {
            toast.success('Invoices sent successfully!')
            fetchTodaysTasks() // Refresh tasks
          } else {
            toast.error('Failed to send invoices. Please try again.')
          }
          break
        case 'attendance':
          // Navigate to attendance page for today
          window.location.href = '/attendance?date=today'
          break
        default:
          break
      }
    } catch (error) {
      console.error('Quick action error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setQuickActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
          {/* Header with Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isTeacher ? 'My Classes Overview' : 'Madrasah Overview'}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isTeacher 
                  ? 'Insights and statistics for your assigned classes'
                  : 'Comprehensive insights into your Islamic education center'}
              </p>
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
              className="px-3 sm:px-4 py-2 text-sm hover:bg-gray-50"
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
            icon={<Users className="h-4 w-4" />}
          />
        </Link>
        <Link href="/invoices" className="block">
          <StatCard
            title="Monthly Revenue"
            value={`£${monthlyRevenue.toLocaleString()}`}
            change={revenueGrowth > 0 ? { value: `+${revenueGrowth.toFixed(1)}%`, type: "positive" } : revenueGrowth < 0 ? { value: `${revenueGrowth.toFixed(1)}%`, type: "negative" } : undefined}
            description="Recurring revenue"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </Link>
        <Link href="/attendance" className="block">
          <StatCard
            title="This Week's Attendance"
            value={`${attendanceRate}%`}
            change={attendanceGrowth > 0 ? { value: `+${attendanceGrowth}%`, type: "positive" } : attendanceGrowth < 0 ? { value: `${attendanceGrowth}%`, type: "negative" } : undefined}
            description="Average attendance rate"
            icon={<UserCheck className="h-4 w-4" />}
          />
        </Link>
        <Link href="/classes" className="block">
          <StatCard
            title="Active Classes"
            value={activeClasses}
            description="Currently running"
            icon={<BookOpen className="h-4 w-4" />}
          />
        </Link>
        <Link href="/applications" className="block">
          <StatCard
            title="Pending Applications"
            value={pendingApplications}
            description="New student applications"
            icon={<FileText className="h-4 w-4" />}
          />
        </Link>
        <Link href="/invoices" className="block">
          <StatCard
            title="Overdue Payments"
            value={overduePayments}
            description="Past due amounts"
            icon={<Clock className="h-4 w-4" />}
          />
        </Link>
        <Link href="/students" className="block">
          <StatCard
            title="New Enrollments"
            value={newStudentsThisMonth}
            change={studentGrowth > 0 ? { value: "This month", type: "positive" } : undefined}
            description="Recent additions"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </Link>
        <Link href="/staff" className="block">
          <StatCard
            title="Staff Members"
            value={staffMembers}
            description="Team size"
            icon={<UserCheck className="h-4 w-4" />}
          />
        </Link>
      </div>

      {/* Today's Tasks Section - Only show for admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
                Today's Tasks
              </CardTitle>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Action items that need your attention today
            </p>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                <p className="text-sm">Loading tasks...</p>
              </div>
            ) : todaysTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">All caught up! No tasks for today.</p>
              </div>
            ) : (
              <div>
                {todaysTasks.map((task, index) => {
                  const IconComponent = 
                    task.icon === 'FileText' ? FileText :
                    task.icon === 'AlertCircle' ? AlertCircle :
                    task.icon === 'DollarSign' ? DollarSign :
                    task.icon === 'UserCheck' ? UserCheck :
                    task.icon === 'Calendar' ? Calendar : FileText

                  // Determine quick action label and icon based on task type
                  const getQuickAction = () => {
                    switch (task.id) {
                      case 'applications':
                        return { label: 'Quick Review', icon: Eye, action: 'review' }
                      case 'overdue-payments':
                        return { label: 'Send Reminder', icon: Send, action: 'remind' }
                      case 'pending-invoices':
                        return { label: 'Send All', icon: Send, action: 'send' }
                      case 'attendance':
                        return { label: 'Mark Now', icon: Zap, action: 'mark' }
                      default:
                        return null
                    }
                  }

                  const quickAction = getQuickAction()

                  return (
                    <div key={task.id}>
                      <div className="flex items-center gap-2 p-4 hover:bg-[var(--accent)] transition-colors">
                        <Link
                          href={task.link}
                          className="flex items-center justify-between gap-4 flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="h-5 w-5 text-[var(--foreground)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                                {task.title}
                              </h3>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {task.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.count > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[var(--muted)] text-[var(--foreground)]">
                                {task.count}
                              </span>
                            )}
                            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                          </div>
                        </Link>
                        {quickAction && (() => {
                          const QuickActionIcon = quickAction.icon
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0 h-8 px-3 text-xs"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleQuickAction(task.id, quickAction.action)
                              }}
                              disabled={quickActionLoading === task.id}
                            >
                              {quickActionLoading === task.id ? (
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <QuickActionIcon className="h-3 w-3 mr-1" />
                              )}
                              {quickAction.label}
                            </Button>
                          )
                        })()}
                      </div>
                      {index < todaysTasks.length - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                <Button variant="ghost" size="sm" className="text-sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {recentActivity.length > 0 ? (
                <div>
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id}>
                      <div className="flex items-start gap-3 p-2 hover:bg-[var(--muted)]/50 transition-colors">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'enrollment' ? 'bg-green-100 text-green-700' :
                        activity.type === 'payment' ? 'bg-blue-100 text-blue-700' :
                        activity.type === 'attendance' ? 'bg-purple-100 text-purple-700' :
                        activity.type === 'message' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
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
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                      </div>
                      {index < recentActivity.length - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
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
                <div>
                  {upcomingEvents.map((event: any, index: number) => {
                    const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const eventDateOnly = new Date(eventDate)
                    eventDateOnly.setHours(0, 0, 0, 0)
                    const isToday = eventDateOnly.toDateString() === today.toDateString()
                    
                    return (
                      <div key={event.id}>
                        <div 
                          className={`flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 hover:bg-[var(--accent)]/30 transition-all ${
                            isToday ? 'bg-[var(--primary)]/5' : ''
                          }`}
                        >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                            event.isHoliday || event.type === 'HOLIDAY' ? 'bg-green-500' : 
                            event.type === 'EXAM' ? 'bg-yellow-500' : 
                            event.type === 'MEETING' ? 'bg-blue-500' : 
                            'bg-purple-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h4 className="font-semibold text-[var(--foreground)] break-words">{event.title}</h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                {isToday && (
                                  <Badge variant="outline" className="text-xs">Today</Badge>
                                )}
                                <Badge 
                                  variant="outline"
                                  className={`sm:hidden ${
                                    event.isHoliday || event.type === 'HOLIDAY' ? 'border-green-500 text-green-700 bg-green-50' : 
                                    event.type === 'EXAM' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 
                                    event.type === 'MEETING' ? 'border-blue-500 text-blue-700 bg-blue-50' : 
                                    'border-purple-500 text-purple-700 bg-purple-50'
                                  }`}
                                >
                                  {event.isHoliday || event.type === 'HOLIDAY' ? 'Holiday' : 
                                   event.type === 'EXAM' ? 'Exam' :
                                   event.type === 'MEETING' ? 'Meeting' :
                                   'Event'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-[var(--muted-foreground)]">
                              <div className="flex items-start sm:items-center gap-2">
                                <Calendar className="h-3 w-3 flex-shrink-0 mt-0.5 sm:mt-0" />
                                <span className="break-words">
                                  {event.endDate && (event.isHoliday || event.type === 'HOLIDAY') ? (
                                    <>
                                      <span className="sm:hidden">
                                        {eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - {event.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {eventDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} - {event.endDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="sm:hidden">
                                        {eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {eventDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                      </span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {index < upcomingEvents.length - 1 && (
                          <div className="border-b border-[var(--border)]" />
                        )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No upcoming events scheduled
                  </p>
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
                  <Button variant="outline" size="sm" className="px-2 sm:px-3 py-1 text-sm hover:bg-gray-50">
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
        orgCreatedAt={orgCreatedAt}
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
