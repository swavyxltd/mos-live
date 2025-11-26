import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ParentWeeklyAttendanceCards } from '@/components/parent-weekly-attendance-cards'
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
  let upcomingClasses: any[] = []
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
    const allMessages = await prisma.message.findMany({
      where: {
        orgId: org.id,
        status: 'SENT',
        OR: [
          { audience: 'ALL' },
          {
            audience: 'BY_CLASS',
            targets: {
              contains: JSON.stringify(classIds)
            }
          },
          {
            audience: 'INDIVIDUAL',
            targets: {
              contains: session.user.id
            }
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    // Filter messages more accurately
    announcements = allMessages.filter((msg: any) => {
      if (msg.audience === 'ALL') return true
      if (msg.audience === 'INDIVIDUAL') {
        try {
          const targets = typeof msg.targets === 'string' ? JSON.parse(msg.targets) : msg.targets
          return Array.isArray(targets) ? targets.includes(session.user.id) : targets === session.user.id
        } catch {
          return String(msg.targets).includes(session.user.id)
        }
      }
      if (msg.audience === 'BY_CLASS') {
        try {
          const targets = typeof msg.targets === 'string' ? JSON.parse(msg.targets) : msg.targets
          const targetClassIds = Array.isArray(targets) ? targets : [targets]
          return targetClassIds.some((id: string) => classIds.includes(id))
        } catch {
          return String(msg.targets).includes(JSON.stringify(classIds))
        }
      }
      return false
    })

    // Get upcoming classes (next 7 days)
    upcomingClasses = await prisma.class.findMany({
        where: { 
          orgId: org.id,
          isArchived: false,
          StudentClass: {
            some: {
              Student: {
                primaryParentId: session.user.id,
                isArchived: false
              }
            }
          }
        },
        include: {
          StudentClass: {
            where: {
              Student: {
                primaryParentId: session.user.id
              }
            },
            include: {
              Student: true
            }
          }
        }
      })

    // Get weekly attendance for parent's students
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    weeklyAttendance = await prisma.attendance.findMany({
        where: {
          orgId: org.id,
          Student: {
            primaryParentId: session.user.id,
            isArchived: false
          },
          date: {
            gte: oneWeekAgo
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

    // Get payment status for parent's students
    const today = new Date()
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
      
      paymentStatus = {
        status: hasOverdue ? 'overdue' : daysUntilDue <= 5 ? 'due' : 'up_to_date',
        amount: totalAmount,
        dueDate: nextInvoice.dueDate,
        daysUntilDue: daysUntilDue,
        isOverdue: hasOverdue
      }
    } else {
      paymentStatus = {
        status: 'up_to_date',
        amount: 0,
        dueDate: null,
        daysUntilDue: null,
        isOverdue: false
      }
    }

    // Get upcoming events (mock for now - can be added later)
    upcomingEvents = []
  } catch (error: any) {
    // Keep empty arrays if database query fails
  }

  // Calculate stats for parent's children
  const totalChildren = students.length
  const totalClasses = students.reduce((acc, student) => acc + (student.StudentClass?.length || 0), 0)
  
  // Calculate overall attendance rate from weekly attendance data
  const attendanceRate = weeklyAttendance.length > 0 
    ? Math.round((weeklyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length / weeklyAttendance.length) * 100)
    : 0
    
  const upcomingEventsCount = upcomingEvents.filter(e => e.date >= new Date()).length

  return (
    <div className="space-y-4 sm:space-y-6">
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
                            Grade {student.grade || 'N/A'}
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

        {/* Recent Announcements and Upcoming Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((announcement: any) => (
                    <Link 
                      key={announcement.id} 
                      href="/parent/announcements"
                      className="block group"
                    >
                      <div className="p-3 border border-[var(--border)] rounded-[var(--radius-md)] hover:border-[var(--primary)] hover:bg-[var(--accent)]/50 transition-all cursor-pointer">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[var(--muted-foreground)]" />
                <CardTitle>Upcoming Classes</CardTitle>
              </div>
              {upcomingClasses.length > 0 && (
                <Link href="/parent/calendar">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View Calendar
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {upcomingClasses.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)]">No upcoming classes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Get next 7 days and find classes
                    const next7Days = Array.from({ length: 7 }, (_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() + i)
                      return date
                    })

                    const upcomingClassesList = next7Days
                      .map(date => {
                        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
                        
                        return upcomingClasses
                          .filter((cls: any) => {
                            let schedule: any = {}
                            if (cls.schedule) {
                              try {
                                schedule = typeof cls.schedule === 'string' 
                                  ? JSON.parse(cls.schedule) 
                                  : cls.schedule
                              } catch (e) {
                                schedule = {}
                              }
                            }
                            const scheduleDays = schedule?.days || []
                            const normalizedScheduleDays = scheduleDays.map((d: string) => d.toLowerCase())
                            return normalizedScheduleDays.includes(dayOfWeek)
                          })
                          .map((cls: any) => ({
                            ...cls,
                            date,
                            dayOfWeek
                          }))
                      })
                      .flat()
                      .slice(0, 3)

                    return upcomingClassesList.map((cls: any, index: number) => {
                      let schedule: any = {}
                      if (cls.schedule) {
                        try {
                          schedule = typeof cls.schedule === 'string' 
                            ? JSON.parse(cls.schedule) 
                            : cls.schedule
                        } catch (e) {
                          schedule = {}
                        }
                      }
                      const startTime = schedule?.startTime || 'TBD'
                      const endTime = schedule?.endTime || 'TBD'
                      const studentCount = cls.StudentClass?.length || 0
                      
                      return (
                        <Link 
                          key={`${cls.id}-${cls.date.getTime()}`}
                          href="/parent/calendar"
                          className="block group"
                        >
                          <div className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-[var(--radius-md)] hover:border-[var(--primary)] hover:bg-[var(--accent)]/50 transition-all cursor-pointer">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full flex items-center justify-center group-hover:bg-[var(--primary)]/20 transition-colors">
                                <Calendar className="h-5 w-5 text-[var(--primary)]" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                {cls.name}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] mt-1">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {startTime} - {endTime}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {studentCount} {studentCount === 1 ? 'child' : 'children'}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-medium text-[var(--foreground)]">
                                {formatDate(cls.date)}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)] capitalize">
                                {cls.dayOfWeek}
                              </p>
                              <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity mt-1 ml-auto" />
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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

              weeklyAttendance.forEach((attendance: any) => {
                const studentId = attendance.Student?.id || attendance.studentId
                const studentName = attendance.Student ? `${attendance.Student.firstName} ${attendance.Student.lastName}` : 'Unknown'
                const className = attendance.Class?.name || attendance.class?.name || 'Unknown'
                const teacherName = attendance.Class?.User?.name || 'Unknown'

                if (!childAttendanceMap.has(studentId)) {
                  childAttendanceMap.set(studentId, {
                    id: studentId,
                    name: studentName,
                    class: className,
                    teacher: teacherName,
                    overallAttendance: 0,
                    weeklyAttendance: []
                  })
                }

                const childData = childAttendanceMap.get(studentId)!
                const date = new Date(attendance.date)
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                const dayName = dayNames[date.getDay()]

                childData.weeklyAttendance.push({
                  day: dayName,
                  date: date.toISOString().split('T')[0],
                  status: attendance.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_SCHEDULED',
                  time: attendance.status === 'PRESENT' || attendance.status === 'LATE' ? '4:00 PM' : undefined
                })
              })

              // Calculate overall attendance for each child
              Array.from(childAttendanceMap.values()).forEach(child => {
                if (child.weeklyAttendance.length > 0) {
                  const presentDays = child.weeklyAttendance.filter(day => 
                    day.status === 'PRESENT' || day.status === 'LATE'
                  ).length
                  child.overallAttendance = Math.round((presentDays / child.weeklyAttendance.length) * 100)
                }
              })

              return Array.from(childAttendanceMap.values())
            })()} />
          </CardContent>
        </Card>

      </div>
  )
}