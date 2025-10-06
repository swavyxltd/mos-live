import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { StatCard } from '@/components/ui/stat-card'
import { WaveChart } from '@/components/ui/wave-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { isDemoMode } from '@/lib/demo-mode'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()

  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  const userRole = await getUserRoleInOrg(session.user.id, org.id) || 'TEACHER'

  // Check if we're in demo mode first
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  // Get dashboard data (with demo fallback)
  let totalStudents = 3, activeClasses = 1, staffCount = 2, todayAttendance = 85, monthlyFees = 5000, overdueInvoices = 1, recentAuditLogs: any[] = []
  
  if (!isDemoMode()) {
    try {
      const [
        students,
        classes,
        staff,
        attendance,
        fees,
        invoices,
        logs
      ] = await Promise.all([
      // Total students
      prisma.student.count({
        where: { orgId: org.id }
      }),

    // Active classes
    prisma.class.count({
      where: { orgId: org.id }
    }),

    // Staff count
    prisma.userOrgMembership.count({
      where: { 
        orgId: org.id,
        role: { in: ['ADMIN', 'TEACHER'] }
      }
    }),

    // Today's attendance percentage
    prisma.attendance.aggregate({
      where: {
        orgId: org.id,
        date: new Date(),
        status: 'PRESENT'
      },
      _count: true
    }),

    // Monthly fees collected
    prisma.payment.aggregate({
      where: {
        orgId: org.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    }),

    // Overdue invoices
    prisma.invoice.count({
      where: {
        orgId: org.id,
        status: 'OVERDUE'
      }
    }),

    // Recent audit logs
    prisma.auditLog.findMany({
      where: { orgId: org.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    ])

    totalStudents = students
    activeClasses = classes
    staffCount = staff
    todayAttendance = attendance._count
    monthlyFees = fees._sum.amount || 0
    overdueInvoices = invoices
    recentAuditLogs = logs
    } catch (error) {
      console.error('Database error, using demo data:', error)
    }
  }

  // Demo data for attendance chart
  const attendanceData = [
    { date: 'Dec 1', value: 85 },
    { date: 'Dec 2', value: 92 },
    { date: 'Dec 3', value: 78 },
    { date: 'Dec 4', value: 88 },
    { date: 'Dec 5', value: 95 },
    { date: 'Dec 6', value: 89 },
    { date: 'Dec 7', value: 91 },
    { date: 'Dec 8', value: 87 },
    { date: 'Dec 9', value: 93 },
    { date: 'Dec 10', value: 90 },
    { date: 'Dec 11', value: 86 },
    { date: 'Dec 12', value: 94 },
    { date: 'Dec 13', value: 88 },
    { date: 'Dec 14', value: 92 },
    { date: 'Dec 15', value: 89 },
    { date: 'Dec 16', value: 91 }
  ]

  // Demo audit logs
  if (isDemoMode()) {
    recentAuditLogs = [
      {
        id: 'demo-log-1',
        action: 'CREATE_STUDENT',
        targetType: 'Student',
        targetId: 'demo-student-1',
        createdAt: new Date('2024-12-06T10:30:00Z'),
        user: { name: 'Demo Admin', email: 'admin@demo.com' }
      },
      {
        id: 'demo-log-2',
        action: 'CREATE_INVOICE',
        targetType: 'Invoice',
        targetId: 'demo-invoice-1',
        createdAt: new Date('2024-12-06T09:15:00Z'),
        user: { name: 'Demo Teacher', email: 'teacher@demo.com' }
      },
      {
        id: 'demo-log-3',
        action: 'CREATE_PAYMENT',
        targetType: 'Payment',
        targetId: 'demo-payment-1',
        createdAt: new Date('2024-12-06T08:45:00Z'),
        user: { name: 'Demo Admin', email: 'admin@demo.com' }
      }
    ]
  }

  return (
    <Page 
      user={session.user} 
      org={org} 
      userRole={userRole}
      title="Dashboard"
      breadcrumbs={[{ label: 'Overview' }]}
    >
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={totalStudents}
            change={{ value: "+12.5%", type: "positive" }}
            description="Trending up this month"
            detail="Enrollment for the last 6 months"
          />
          <StatCard
            title="Active Classes"
            value={activeClasses}
            change={{ value: "+2", type: "positive" }}
            description="New classes added"
            detail="Current semester"
          />
          <StatCard
            title="Staff Members"
            value={staffCount}
            change={{ value: "0%", type: "neutral" }}
            description="No changes this period"
            detail="Teaching and admin staff"
          />
          <StatCard
            title="Today's Attendance"
            value={`${todayAttendance}%`}
            change={{ value: "+5%", type: "positive" }}
            description="Above average today"
            detail="Compared to last week"
          />
        </div>

        {/* Attendance Chart */}
        <WaveChart
          title="Daily Attendance"
          subtitle="Attendance percentage for the last 2 weeks"
          data={attendanceData}
        />

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <Tabs defaultValue="recent-activity" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="attendance">Attendance Trend</TabsTrigger>
              </TabsList>
              
              <TabsContent value="recent-activity" className="mt-6">
                <div className="space-y-4">
                  {recentAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-center space-x-4 p-4 border border-[var(--border)] rounded-[var(--radius-md)]">
                      <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {log.user?.name || log.user?.email || 'System'} {log.action.toLowerCase().replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="invoices" className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>INV-001</TableCell>
                      <TableCell>Ahmed Hassan</TableCell>
                      <TableCell>£150.00</TableCell>
                      <TableCell><Badge variant="secondary">Paid</Badge></TableCell>
                      <TableCell>2024-12-15</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>INV-002</TableCell>
                      <TableCell>Fatima Ali</TableCell>
                      <TableCell>£200.00</TableCell>
                      <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
                      <TableCell>2024-12-10</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="attendance" className="mt-6">
                <div className="text-center py-8">
                  <p className="text-[var(--muted-foreground)]">Attendance trend chart would go here</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </Page>
  )
}