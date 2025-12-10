import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ParentWeeklyAttendanceCards } from '@/components/parent-weekly-attendance-cards'
import { SetOverdueBannerData } from '@/components/set-overdue-banner-data'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { 
  Users, 
  Calendar, 
  Clock, 
  Bell, 
  ArrowRight, 
  BookOpen,
  User,
  ChevronRight
} from 'lucide-react'
export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg(session?.user?.id)
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  const userRole = await getUserRoleInOrg(session.user.id, org.id) || 'PARENT'
  
  let students: any[] = []
  let announcements: any[] = []
  let weeklyAttendance: any[] = []
  let upcomingEvents: any[] = []
  let paymentStatus: any = null

  try {
    // Get parent's students from database (excluding archived)
    students = await prisma.student.findMany({
      where: { 
        orgId: org.id,
        primaryParentId: session.user.id,
        isArchived: false
      },
      include: {
        StudentClass: {
          include: {
            Class: true
          }
        }
      }
    })

    // Get recent announcements - messages sent to all parents, parent's classes, or directly to parent
    const classIds = students.flatMap(s => s.StudentClass.map((sc: any) => sc.Class.id))
    
    // Get all messages for the org (we'll filter them properly below)
    const allMessages = await prisma.message.findMany({
      where: {
        orgId: org.id,
        status: 'SENT'
      },
      orderBy: { createdAt: 'desc' },
      take: 10 // Get more messages to filter from
    })
    
    // Filter messages more accurately - matching the announcements page logic
    announcements = allMessages.filter((msg: any) => {
      if (msg.audience === 'ALL') return true
      
      if (msg.audience === 'BY_CLASS') {
        try {
          const targets = msg.targets ? JSON.parse(msg.targets) : {}
          const messageClassIds = targets.classIds || []
          // Check if any of the parent's classes match the message's target classes
          return messageClassIds.some((cid: string) => classIds.includes(cid))
        } catch (e) {
          // Fallback: try to match class IDs in the string
          if (classIds.length > 0) {
            return classIds.some((cid: string) => String(msg.targets).includes(cid))
          }
          return false
        }
      }
      
      if (msg.audience === 'INDIVIDUAL') {
        try {
          const targets = msg.targets ? JSON.parse(msg.targets) : {}
          // Check if this parent is the target
          return targets.parentId === session.user.id
        } catch (e) {
          // Fallback: check if user ID is in the string
          return String(msg.targets).includes(session.user.id)
        }
      }
      
      return false
    }).slice(0, 5) // Limit to 5 most recent after filtering


    // Get weekly attendance for parent's students (current week: Monday to Friday)
    const today = new Date()
    const currentDay = today.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert Sunday (0) to 6, others to 0-4
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - daysFromMonday)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4) // Friday (5 days: Mon-Fri)
    weekEnd.setHours(23, 59, 59, 999)
    
    weeklyAttendance = await prisma.attendance.findMany({
        where: {
          orgId: org.id,
          Student: {
            primaryParentId: session.user.id,
            isArchived: false
          },
          date: {
            gte: weekStart,
            lte: weekEnd
          }
        },
        include: {
          Student: true,
          Class: {
            include: {
              User: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })

    // Get payment status for parent's students (reuse today variable)
    const allInvoices = await prisma.invoice.findMany({
        where: {
          orgId: org.id,
          Student: {
            primaryParentId: session.user.id,
            isArchived: false
          },
          status: {
            in: ['PENDING', 'OVERDUE']
          }
        },
        orderBy: { dueDate: 'asc' }
      })

    if (allInvoices.length > 0) {
      // Calculate total amount (convert from pence to pounds)
      const totalAmount = allInvoices.reduce((sum, invoice) => sum + (invoice.amountP || 0), 0) / 100
      
      // Get the earliest due date
      const nextInvoice = allInvoices[0]
      const daysUntilDue = Math.ceil((nextInvoice.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      // Check if any are overdue
      const hasOverdue = allInvoices.some(inv => {
        const days = Math.ceil((inv.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return days <= 0
      })
      
      // Calculate overdue count and amount
      const overdueInvoices = allInvoices.filter(inv => {
        const days = Math.ceil((inv.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return days <= 0
      })
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.amountP || 0), 0) / 100
      const overdueCount = overdueInvoices.length
      
      paymentStatus = {
        status: hasOverdue ? 'overdue' : daysUntilDue <= 5 ? 'due' : 'up_to_date',
        amount: totalAmount,
        dueDate: nextInvoice.dueDate,
        daysUntilDue: daysUntilDue,
        isOverdue: hasOverdue,
        overdueAmount: overdueAmount,
        overdueCount: overdueCount
      }
    } else {
      paymentStatus = {
        status: 'up_to_date',
        amount: 0,
        dueDate: null,
        daysUntilDue: null,
        isOverdue: false,
        overdueAmount: 0,
        overdueCount: 0
      }
    }

    // Get upcoming events for parent's org and their children's classes
    // Reuse today variable from above
    const todayForEvents = new Date()
    todayForEvents.setHours(0, 0, 0, 0)
    const next30Days = new Date(todayForEvents)
    next30Days.setDate(todayForEvents.getDate() + 30)
    
    // Get events for the org that are:
    // 1. Org-wide events (classId is null)
    // 2. Events for parent's children's classes
    // 3. Meetings for parent's children (studentId matches)
    const studentIds = students.map(s => s.id)
    
    upcomingEvents = await prisma.event.findMany({
      where: {
        orgId: org.id,
        date: {
          gte: todayForEvents,
          lte: next30Days
        },
        OR: [
          { classId: null }, // Org-wide events
          { classId: { in: classIds } }, // Events for parent's children's classes
          { studentId: { in: studentIds } } // Meetings for parent's children
        ]
      },
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        },
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { date: 'asc' },
      take: 10 // Limit to 10 most upcoming
    })
  } catch (error: any) {
    // Keep empty arrays if database query fails
  }

  // Calculate stats for parent's children
  const totalChildren = students.length
  // Count unique classes (not total enrollments)
  const uniqueClassIds = new Set<string>()
  students.forEach(student => {
    student.StudentClass?.forEach((sc: any) => {
      if (sc.Class?.id) {
        uniqueClassIds.add(sc.Class.id)
      }
    })
  })
  const totalClasses = uniqueClassIds.size
  
  // Calculate overall attendance rate from weekly attendance data
  // Only count days that have occurred so far (today or earlier) AND have actual attendance records
  const todayForStat = new Date()
  todayForStat.setHours(0, 0, 0, 0)
  const todayDateString = todayForStat.toISOString().split('T')[0] // YYYY-MM-DD format
  
  const daysSoFar = weeklyAttendance.filter(a => {
    const attendanceDate = a.date ? new Date(a.date) : null
    if (!attendanceDate) return false
    const attendanceDateString = attendanceDate.toISOString().split('T')[0]
    const hasOccurred = attendanceDateString <= todayDateString
    const hasAttendanceRecord = a.status !== 'NOT_SCHEDULED'
    return hasOccurred && hasAttendanceRecord
  })
  
  const attendanceRate = daysSoFar.length > 0 
    ? Math.round((daysSoFar.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length / daysSoFar.length) * 100)
    : 0
    
  const upcomingEventsCount = upcomingEvents.filter(e => e.date >= new Date()).length

  return (
    <div className="space-y-4 sm:space-y-6">
        <SetOverdueBannerData 
          hasOverdue={paymentStatus?.isOverdue || false}
          overdueAmount={paymentStatus?.overdueAmount || 0}
          overdueCount={paymentStatus?.overdueCount || 0}
        />
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome back, {session.user.name?.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Here's what's happening with your children at {org.name}.
          </p>
        </div>

        {/* Parent-specific Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            title="My Children"
            value={totalChildren}
            change={{ value: `${totalChildren} enrolled`, type: "neutral" }}
            description="Currently enrolled"
          />
          <StatCard
            title="Total Classes"
            value={totalClasses}
            change={{ value: "All active", type: "positive" }}
            description="Classes this term"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            change={{ value: attendanceRate >= 95 ? "+5%" : "0%", type: attendanceRate >= 95 ? "positive" : "neutral" }}
            description={attendanceRate >= 95 ? "Excellent attendance" : attendanceRate >= 86 ? "Good attendance" : "Needs improvement"}
          />
          <StatCard
            title="Payment Status"
            value={paymentStatus?.status === 'up_to_date' ? '£0' : 
                   paymentStatus?.status === 'due' ? `£${paymentStatus?.amount?.toFixed(2) || '0.00'}` :
                   paymentStatus?.status === 'overdue' ? `£${paymentStatus?.amount?.toFixed(2) || '0.00'}` : '£0'}
            change={{ 
              value: paymentStatus?.status === 'up_to_date' ? "All paid" : 
                     paymentStatus?.status === 'due' ? `${paymentStatus?.daysUntilDue ?? 0} days` :
                     paymentStatus?.status === 'overdue' ? `${Math.abs(paymentStatus?.daysUntilDue ?? 0)} days late` : "All paid", 
              type: paymentStatus?.status === 'up_to_date' ? "positive" : 
                    paymentStatus?.status === 'due' ? "neutral" : "negative"
            }}
            description={paymentStatus?.status === 'up_to_date' ? "No payments due" : 
                        paymentStatus?.status === 'due' ? "Payment due soon" :
                        paymentStatus?.status === 'overdue' ? "Payment overdue" : "No payments due"}
          />
        </div>

        {/* My Children Section - Enhanced */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
              <CardTitle>My Children</CardTitle>
            </div>
            {students.length > 0 && (
              <Link href="/parent/children">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                <p className="text-sm text-[var(--muted-foreground)]">No children enrolled yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => {
                  const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase()
                  const classCount = student.StudentClass?.length || 0
                  
                  return (
                    <Link 
                      key={student.id} 
                      href={`/parent/attendance?student=${student.id}`}
                      className="group"
                    >
                      <div className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-[var(--radius-md)] hover:border-[var(--primary)] hover:bg-[var(--accent)]/50 transition-all cursor-pointer">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                            <span className="text-sm font-semibold text-[var(--primary)]">
                              {initials}
                            </span>
                          </div>
                        </div>
                        
                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {student.StudentClass?.slice(0, 2).map((sc: any) => (
                              <Badge key={sc.Class.id} variant="secondary" className="text-xs">
                                {sc.Class.name}
                              </Badge>
                            )) || []}
                            {classCount > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{classCount - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Class Count */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-1 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                            <BookOpen className="h-4 w-4" />
                            <span className="text-sm font-medium">{classCount}</span>
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {classCount === 1 ? 'class' : 'classes'}
                          </p>
                          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--muted-foreground)]" />
                <CardTitle>Recent Announcements</CardTitle>
              </div>
              {announcements.length > 0 && (
                <Link href="/parent/announcements">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)]">No announcements yet</p>
                </div>
              ) : (
                <div>
                  {announcements.slice(0, 3).map((announcement: any, index: number) => (
                    <div key={announcement.id}>
                      <Link 
                        href="/parent/announcements"
                        className="block group"
                      >
                        <div className="p-3 hover:bg-[var(--accent)]/50 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                              {announcement.subject || announcement.title || 'Announcement'}
                            </h4>
                            {announcement.content && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                                {announcement.content}
                              </p>
                            )}
                            <p className="text-xs text-[var(--muted-foreground)] mt-2">
                              {formatDateTime(announcement.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        </div>
                        </div>
                      </Link>
                      {index < Math.min(announcements.length, 3) - 1 && (
                        <div className="border-b border-[var(--border)]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        {/* Weekly Attendance */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--muted-foreground)]" />
              <CardTitle>Weekly Attendance</CardTitle>
            </div>
            <Link href="/parent/attendance">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ParentWeeklyAttendanceCards attendanceData={(() => {
              // Transform attendance data to match component's expected format
              const childAttendanceMap = new Map<string, {
                id: string
                name: string
                class: string
                teacher: string
                overallAttendance: number
                weeklyAttendance: Array<{
                  day: string
                  date: string
                  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
                  time?: string
                }>
              }>()

              // Get current week (Monday to Friday)
              const today = new Date()
              const currentDay = today.getDay()
              const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Convert Sunday (0) to 6, others to 0-4
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - daysFromMonday)
              weekStart.setHours(0, 0, 0, 0)

              // Generate all weekdays (Monday to Friday)
              const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
              const weekDays: Array<{ day: string; date: Date }> = []
              for (let i = 0; i < 5; i++) {
                const date = new Date(weekStart)
                date.setDate(weekStart.getDate() + i)
                weekDays.push({
                  day: dayNames[i],
                  date: date
                })
              }

              // Build attendance map by student and date
              const attendanceByStudentAndDate = new Map<string, Map<string, any>>()
              weeklyAttendance.forEach((attendance: any) => {
                const studentId = attendance.Student?.id || attendance.studentId
                const dateKey = new Date(attendance.date).toISOString().split('T')[0]
                
                if (!attendanceByStudentAndDate.has(studentId)) {
                  attendanceByStudentAndDate.set(studentId, new Map())
                }
                attendanceByStudentAndDate.get(studentId)!.set(dateKey, attendance)
              })

              // Build child attendance data with all weekdays
              students.forEach((student) => {
                const studentId = student.id
                const studentName = `${student.firstName} ${student.lastName}`
                const primaryClass = student.StudentClass?.[0]?.Class
                const className = primaryClass?.name || 'Unknown'
                const teacherName = primaryClass?.User?.name || 'Unknown'

                const weeklyData: Array<{
                  day: string
                  date: string
                  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED'
                  time?: string
                }> = []

                weekDays.forEach(({ day, date }) => {
                  const dateKey = date.toISOString().split('T')[0]
                  const attendance = attendanceByStudentAndDate.get(studentId)?.get(dateKey)
                  
                  if (attendance) {
                    weeklyData.push({
                      day: day,
                      date: dateKey,
                      status: attendance.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED',
                      time: attendance.status === 'PRESENT' || attendance.status === 'LATE' ? '4:00 PM' : undefined
                    })
                  } else {
                    // No attendance record for this day - show as NOT_SCHEDULED
                    weeklyData.push({
                      day: day,
                      date: dateKey,
                      status: 'NOT_SCHEDULED',
                      time: undefined
                    })
                  }
                })

                childAttendanceMap.set(studentId, {
                  id: studentId,
                  name: studentName,
                  class: className,
                  teacher: teacherName,
                  overallAttendance: 0,
                  weeklyAttendance: weeklyData
                })
              })

              // Calculate overall attendance for each child (only count days that have occurred so far)
              const todayForCalculation = new Date()
              const todayDateString = todayForCalculation.toISOString().split('T')[0] // YYYY-MM-DD format
              
              Array.from(childAttendanceMap.values()).forEach(child => {
                if (child.weeklyAttendance.length > 0) {
                  // Filter to only days that have occurred (today or earlier) AND have actual attendance records
                  // Exclude NOT_SCHEDULED days from the calculation
                  const daysSoFar = child.weeklyAttendance.filter(day => {
                    const hasOccurred = day.date <= todayDateString
                    const hasAttendanceRecord = day.status !== 'NOT_SCHEDULED'
                    return hasOccurred && hasAttendanceRecord
                  })
                  
                  // Count present/late days that have occurred
                  const presentDays = daysSoFar.filter(day => 
                    day.status === 'PRESENT' || day.status === 'LATE'
                  ).length
                  
                  // Count total days that have occurred with attendance records
                  const totalDaysSoFar = daysSoFar.length
                  
                  child.overallAttendance = totalDaysSoFar > 0 
                    ? Math.round((presentDays / totalDaysSoFar) * 100)
                    : 0
                }
              })

              return Array.from(childAttendanceMap.values())
            })()} />
          </CardContent>
        </Card>

      </div>
  )
}