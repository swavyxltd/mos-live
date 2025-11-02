import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ParentWeeklyAttendanceCards } from '@/components/parent-weekly-attendance-cards'
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
          studentClasses: {
            include: {
            class: true
          }
        }
      }
    })

    // Get recent announcements
    announcements = await prisma.message.findMany({
        where: { 
          orgId: org.id,
          audience: 'ALL',
          status: 'SENT'
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })

    // Get upcoming classes (next 7 days)
    upcomingClasses = await prisma.class.findMany({
        where: { 
          orgId: org.id,
          isArchived: false,
          studentClasses: {
            some: {
              student: {
                primaryParentId: session.user.id,
                isArchived: false
              }
            }
          }
        },
        include: {
          studentClasses: {
            where: {
              student: {
                primaryParentId: session.user.id
              }
            },
            include: {
              student: true
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
          student: {
            primaryParentId: session.user.id,
            isArchived: false
          },
          date: {
            gte: oneWeekAgo
          }
        },
        include: {
          student: true,
          class: true
        }
      })

    // Get payment status for parent's students
    const today = new Date()
    const upcomingInvoices = await prisma.invoice.findMany({
        where: {
          orgId: org.id,
          student: {
            primaryParentId: session.user.id,
            isArchived: false
          },
          status: {
            in: ['PENDING', 'OVERDUE']
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 1
      })

    if (upcomingInvoices.length > 0) {
      const nextInvoice = upcomingInvoices[0]
      const daysUntilDue = Math.ceil((nextInvoice.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      paymentStatus = {
        status: daysUntilDue <= 0 ? 'overdue' : daysUntilDue <= 5 ? 'due' : 'up_to_date',
        amount: nextInvoice.amount,
        dueDate: nextInvoice.dueDate,
        daysUntilDue: daysUntilDue,
        isOverdue: daysUntilDue <= 0
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
    console.error('[ParentDashboard] Error fetching data:', error?.message || error)
    // Keep empty arrays if database query fails
  }

  // Calculate stats for parent's children
  const totalChildren = students.length
  const totalClasses = students.reduce((acc, student) => acc + student.studentClasses.length, 0)
  
  // Calculate overall attendance rate from weekly attendance data
  const attendanceRate = weeklyAttendance.length > 0 
    ? Math.round((weeklyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length / weeklyAttendance.length) * 100)
    : 0
    
  const upcomingEventsCount = upcomingEvents.filter(e => e.date >= new Date()).length

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome back, {session.user.name?.split(' ')[0]}!</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Here's what's happening with your children at {org.name}.
          </p>
        </div>

        {/* Parent-specific Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="My Children"
            value={totalChildren}
            change={{ value: `${totalChildren} enrolled`, type: "neutral" }}
            description="Currently enrolled"
            detail="Active students"
          />
          <StatCard
            title="Total Classes"
            value={totalClasses}
            change={{ value: "All active", type: "positive" }}
            description="Classes this term"
            detail="Monday-Friday 5-7 PM"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            change={{ value: attendanceRate >= 95 ? "+5%" : "0%", type: attendanceRate >= 95 ? "positive" : "neutral" }}
            description={attendanceRate >= 95 ? "Excellent attendance" : attendanceRate >= 86 ? "Good attendance" : "Needs improvement"}
            detail="Last 7 days"
          />
          <StatCard
            title="Payment Status"
            value={paymentStatus?.status === 'up_to_date' ? '£0' : 
                   paymentStatus?.status === 'due' ? `£${paymentStatus.amount}` :
                   paymentStatus?.status === 'overdue' ? `£${paymentStatus.amount}` : '£0'}
            change={{ 
              value: paymentStatus?.status === 'up_to_date' ? "All paid" : 
                     paymentStatus?.status === 'due' ? `${paymentStatus.daysUntilDue} days` :
                     paymentStatus?.status === 'overdue' ? `${Math.abs(paymentStatus.daysUntilDue)} days late` : "All paid", 
              type: paymentStatus?.status === 'up_to_date' ? "positive" : 
                    paymentStatus?.status === 'due' ? "neutral" : "negative"
            }}
            description={paymentStatus?.status === 'up_to_date' ? "No payments due" : 
                        paymentStatus?.status === 'due' ? "Payment due soon" :
                        paymentStatus?.status === 'overdue' ? "Payment overdue" : "No payments due"}
            detail={paymentStatus?.dueDate ? `Due: ${paymentStatus.dueDate.toLocaleDateString()}` : "No upcoming payments"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Children */}
          <Card>
            <CardHeader>
              <CardTitle>My Children</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border border-[var(--border)] rounded-[var(--radius-md)]">
                    <div>
                      <h3 className="font-medium text-[var(--foreground)]">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">Grade {student.grade}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {student.studentClasses.map((sc: any) => (
                          <Badge key={sc.class.id} variant="secondary" className="text-xs">
                            {sc.class.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {student.studentClasses.length} class{student.studentClasses.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                    <div>
                      <h4 className="font-medium text-[var(--foreground)]">{event.title}</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">{event.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={event.type === 'HOLIDAY' ? 'secondary' : 'default'}>
                        {event.type}
                      </Badge>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ParentWeeklyAttendanceCards attendanceData={weeklyAttendance} />
          </CardContent>
        </Card>

      </div>
  )
}