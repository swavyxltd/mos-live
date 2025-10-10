import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { isDemoMode } from '@/lib/demo-mode'

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  const userRole = await getUserRoleInOrg(session.user.id, org.id) || 'PARENT'

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let students: any[] = []
  let announcements: any[] = []
  let upcomingClasses: any[] = []
  let weeklyAttendance: any[] = []
  let recentProgress: any[] = []
  let upcomingEvents: any[] = []

  if (isDemoMode()) {
    // Demo data for parent dashboard - only show data for their children
    students = [
      {
        id: 'demo-student-1',
        firstName: 'Ahmed',
        lastName: 'Hassan',
        grade: '3',
        studentClasses: [
          {
            class: {
              id: 'demo-class-1',
              name: 'Quran Recitation - Level 1',
              schedule: 'Monday, Wednesday, Friday 5:00 PM - 7:00 PM',
              room: 'Room A'
            }
          }
        ]
      },
      {
        id: 'demo-student-2',
        firstName: 'Fatima',
        lastName: 'Hassan',
        grade: '5',
        studentClasses: [
          {
            class: {
              id: 'demo-class-2',
              name: 'Islamic Studies - Level 2',
              schedule: 'Monday, Wednesday, Friday 5:00 PM - 7:00 PM',
              room: 'Room B'
            }
          }
        ]
      }
    ]

    announcements = [
      {
        id: 'demo-announcement-1',
        subject: 'Winter Break Notice',
        content: 'School will be closed for winter break from December 23 - January 2. Classes resume on January 3.',
        createdAt: new Date('2024-12-05'),
        type: 'ANNOUNCEMENT'
      },
      {
        id: 'demo-announcement-2',
        subject: 'End of Term Exams',
        content: 'End of term examinations will be held next week. Please ensure your children are well-prepared.',
        createdAt: new Date('2024-12-03'),
        type: 'ANNOUNCEMENT'
      }
    ]

    upcomingClasses = [
      {
        id: 'demo-class-1',
        name: 'Quran Recitation - Level 1',
        schedule: 'Monday, Wednesday, Friday 5:00 PM - 7:00 PM',
        room: 'Room A',
        teacher: 'Omar Khan',
        studentClasses: [
          {
            student: {
              id: 'demo-student-1',
              firstName: 'Ahmed',
              lastName: 'Hassan'
            }
          }
        ]
      },
      {
        id: 'demo-class-2',
        name: 'Islamic Studies - Level 2',
        schedule: 'Monday, Wednesday, Friday 5:00 PM - 7:00 PM',
        room: 'Room B',
        teacher: 'Aisha Patel',
        studentClasses: [
          {
            student: {
              id: 'demo-student-2',
              firstName: 'Fatima',
              lastName: 'Hassan'
            }
          }
        ]
      }
    ]

    weeklyAttendance = [
      {
        id: 'demo-attendance-1',
        student: { firstName: 'Ahmed', lastName: 'Hassan' },
        class: { name: 'Quran Recitation - Level 1' },
        status: 'PRESENT',
        date: new Date('2024-12-06')
      },
      {
        id: 'demo-attendance-2',
        student: { firstName: 'Fatima', lastName: 'Hassan' },
        class: { name: 'Islamic Studies - Level 2' },
        status: 'PRESENT',
        date: new Date('2024-12-05')
      },
      {
        id: 'demo-attendance-3',
        student: { firstName: 'Ahmed', lastName: 'Hassan' },
        class: { name: 'Quran Recitation - Level 1' },
        status: 'LATE',
        date: new Date('2024-12-04')
      }
    ]

    recentProgress = [
      {
        id: 'demo-progress-1',
        student: { firstName: 'Ahmed', lastName: 'Hassan' },
        subject: 'Quran Recitation',
        achievement: 'Completed Surah Al-Fatiha',
        date: new Date('2024-12-05'),
        teacher: 'Omar Khan'
      },
      {
        id: 'demo-progress-2',
        student: { firstName: 'Fatima', lastName: 'Hassan' },
        subject: 'Islamic Studies',
        achievement: 'Excellent performance in Prophet Stories',
        date: new Date('2024-12-04'),
        teacher: 'Aisha Patel'
      }
    ]

    upcomingEvents = [
      {
        id: 'demo-event-1',
        title: 'Christmas Break',
        date: new Date('2024-12-25'),
        type: 'HOLIDAY',
        description: 'School closed for Christmas Day'
      },
      {
        id: 'demo-event-2',
        title: 'New Year Holiday',
        date: new Date('2025-01-01'),
        type: 'HOLIDAY',
        description: 'School closed for New Year'
      },
      {
        id: 'demo-event-3',
        title: 'End of Term Exams',
        date: new Date('2024-12-20'),
        type: 'EXAM',
        description: 'Final examinations for all classes'
      }
    ]
  } else {
    // Get parent's students from database
    students = await prisma.student.findMany({
      where: { 
        orgId: org.id,
        primaryParentId: session.user.id
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
        studentClasses: {
          some: {
            student: {
              primaryParentId: session.user.id
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
          }
        },
        include: {
          student: true
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
          primaryParentId: session.user.id
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
  }

  // Calculate stats for parent's children
  const totalChildren = students.length
  const totalClasses = students.reduce((acc, student) => acc + student.studentClasses.length, 0)
  const attendanceRate = weeklyAttendance.length > 0 
    ? Math.round((weeklyAttendance.filter(a => a.status === 'PRESENT').length / weeklyAttendance.length) * 100)
    : 0
  const upcomingEventsCount = upcomingEvents.filter(e => e.date >= new Date()).length

  return (
    <Page 
      user={session.user} 
      org={org} 
      userRole={userRole}
      title="Parent Dashboard"
      breadcrumbs={[{ label: 'Overview' }]}
    >
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
            change={{ value: attendanceRate >= 90 ? "+5%" : "0%", type: attendanceRate >= 90 ? "positive" : "neutral" }}
            description={attendanceRate >= 90 ? "Excellent attendance" : "Good attendance"}
            detail="Last 7 days"
          />
          <StatCard
            title="Upcoming Events"
            value={upcomingEventsCount}
            change={{ value: "This month", type: "neutral" }}
            description="Holidays & exams"
            detail="Check calendar for details"
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

          {/* Recent Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProgress.map((progress) => (
                  <div key={progress.id} className="p-4 border border-[var(--border)] rounded-[var(--radius-md)]">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[var(--foreground)]">
                          {progress.student.firstName} {progress.student.lastName}
                        </h4>
                        <p className="text-sm text-[var(--muted-foreground)]">{progress.subject}</p>
                        <p className="text-sm text-[var(--foreground)] mt-1">{progress.achievement}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {progress.teacher}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">
                      {new Date(progress.date).toLocaleDateString()}
                    </p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyAttendance.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      {attendance.student.firstName} {attendance.student.lastName}
                    </TableCell>
                    <TableCell>{attendance.class.name}</TableCell>
                    <TableCell>{new Date(attendance.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={attendance.status === 'PRESENT' ? 'default' : attendance.status === 'LATE' ? 'secondary' : 'destructive'}
                      >
                        {attendance.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </Page>
  )
}