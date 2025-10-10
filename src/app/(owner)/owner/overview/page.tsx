import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { OwnerOverviewStats } from '@/components/owner-overview-stats'
import { OwnerRevenueChart } from '@/components/owner-revenue-chart'
import { OwnerOrgsTable } from '@/components/owner-orgs-table'
import { RecentPlatformActivity } from '@/components/recent-platform-activity'

export default async function OwnerOverviewPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  // Demo data
  let totalOrgs = 3, totalStudents = 45, totalRevenue = 15000, overdueCount = 2, recentRevenue = 5000
  
  if (!isDemoMode()) {
    try {
      // Get platform-wide statistics
      const [
        orgs,
        students,
        revenue,
        overdue,
        recent
      ] = await Promise.all([
      // Total organizations
      prisma.org.count(),
      
      // Total students across all orgs (excluding archived)
      prisma.student.count({
        where: {
          isArchived: false
        }
      }),
      
      // Total revenue (last 30 days)
      (async () => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const result = await prisma.payment.aggregate({
          where: {
            status: 'SUCCEEDED',
            createdAt: {
              gte: thirtyDaysAgo
            }
          },
          _sum: {
            amountP: true
          }
        })
        
        return result._sum.amountP || 0
      })(),
      
      // Overdue invoices count
      prisma.invoice.count({
        where: {
          status: 'OVERDUE'
        }
      }),
      
      // Recent revenue (last 7 days)
      (async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const result = await prisma.payment.aggregate({
          where: {
            status: 'SUCCEEDED',
            createdAt: {
              gte: sevenDaysAgo
            }
          },
          _sum: {
            amountP: true
          }
        })
        
        return result._sum.amountP || 0
      })()
    ])

      totalOrgs = orgs
      totalStudents = students
      totalRevenue = revenue
      overdueCount = overdue
      recentRevenue = recent
    } catch (error) {
      console.error('Database error, using demo data:', error)
    }
  }

  // Demo data for charts and tables
  const monthlyRevenue = [
    { month: 'Jan 2024', revenue: 1200 },
    { month: 'Feb 2024', revenue: 1500 },
    { month: 'Mar 2024', revenue: 1800 },
    { month: 'Apr 2024', revenue: 2000 },
    { month: 'May 2024', revenue: 2200 },
    { month: 'Jun 2024', revenue: 2500 },
    { month: 'Jul 2024', revenue: 2800 },
    { month: 'Aug 2024', revenue: 3000 },
    { month: 'Sep 2024', revenue: 3200 },
    { month: 'Oct 2024', revenue: 3500 },
    { month: 'Nov 2024', revenue: 3800 },
    { month: 'Dec 2024', revenue: 4000 }
  ]

  const orgsWithUsage = [
    {
      id: 'demo-org-1',
      name: 'Leicester Islamic Centre',
      createdAt: new Date('2024-01-15'),
      _count: { students: 25, invoices: 1 },
      platformBilling: { status: 'ACTIVE' }
    },
    {
      id: 'demo-org-2', 
      name: 'Manchester Islamic School',
      createdAt: new Date('2024-02-20'),
      _count: { students: 15, invoices: 0 },
      platformBilling: { status: 'ACTIVE' }
    },
    {
      id: 'demo-org-3',
      name: 'Birmingham Quran Academy', 
      createdAt: new Date('2024-03-10'),
      _count: { students: 5, invoices: 1 },
      platformBilling: { status: 'ACTIVE' }
    }
  ]

  const recentActivity = [
    {
      id: 'demo-1',
      action: 'CREATE_ORG',
      targetType: 'Organization',
      targetId: 'demo-org-3',
      createdAt: new Date('2024-12-06T10:30:00Z'),
      user: { name: 'Ahmed Hassan', email: 'owner@demo.com' },
      org: { name: 'Birmingham Quran Academy' }
    },
    {
      id: 'demo-2',
      action: 'CREATE_PAYMENT',
      targetType: 'Payment',
      targetId: 'demo-payment-1',
      createdAt: new Date('2024-12-06T09:15:00Z'),
      user: { name: 'System', email: 'system@madrasah.io' },
      org: { name: 'Leicester Islamic Centre' }
    }
  ]

  // Demo org data
  const org = {
    id: 'demo-platform',
    name: 'Madrasah OS Platform',
    slug: 'madrasah-os-platform'
  }

  return (
    <Page 
      user={session.user} 
      org={org} 
      userRole="OWNER"
      title="Platform Overview"
      breadcrumbs={[{ href: '/owner/overview', label: 'Overview' }]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Platform Overview</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Monitor your Madrasah OS platform performance and revenue.
          </p>
        </div>

        <OwnerOverviewStats
          totalOrgs={totalOrgs}
          totalStudents={totalStudents}
          totalRevenue={totalRevenue}
          overdueCount={overdueCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OwnerRevenueChart data={monthlyRevenue} />
          <RecentPlatformActivity logs={recentActivity} />
        </div>

        <OwnerOrgsTable orgs={orgsWithUsage} />
      </div>
    </Page>
  )
}