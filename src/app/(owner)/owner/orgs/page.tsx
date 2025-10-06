import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { AllOrgsTable } from '@/components/all-orgs-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function OwnerOrgsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let orgsWithStats: any[] = []

  if (isDemoMode()) {
    // Demo data for organizations
    orgsWithStats = [
      {
        id: 'demo-org-1',
        name: 'Leicester Islamic Centre',
        slug: 'leicester-islamic-centre',
        timezone: 'Europe/London',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-06'),
        _count: {
          students: 25,
          classes: 3,
          memberships: 4,
          invoices: 1
        },
        platformBilling: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date('2024-12-31')
        },
        owner: {
          name: 'Ahmed Hassan',
          email: 'owner@demo.com'
        },
        totalRevenue: 5000,
        lastActivity: new Date('2024-12-06')
      },
      {
        id: 'demo-org-2',
        name: 'Manchester Islamic School',
        slug: 'manchester-islamic-school',
        timezone: 'Europe/London',
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-12-05'),
        _count: {
          students: 15,
          classes: 2,
          memberships: 3,
          invoices: 0
        },
        platformBilling: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date('2024-12-31')
        },
        owner: {
          name: 'Fatima Ali',
          email: 'admin@demo.com'
        },
        totalRevenue: 3000,
        lastActivity: new Date('2024-12-05')
      },
      {
        id: 'demo-org-3',
        name: 'Birmingham Quran Academy',
        slug: 'birmingham-quran-academy',
        timezone: 'Europe/London',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-12-04'),
        _count: {
          students: 10,
          classes: 1,
          memberships: 2,
          invoices: 1
        },
        platformBilling: {
          status: 'PAST_DUE',
          currentPeriodEnd: new Date('2024-11-30')
        },
        owner: {
          name: 'Omar Khan',
          email: 'teacher@demo.com'
        },
        totalRevenue: 2000,
        lastActivity: new Date('2024-12-04')
      }
    ]
  } else {
    // Get all organizations with detailed stats from database
    const orgs = await prisma.org.findMany({
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
            memberships: true,
            invoices: {
              where: { status: 'OVERDUE' }
            }
          }
        },
        platformBilling: true,
        memberships: {
          where: { role: 'OWNER' },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate additional stats
    orgsWithStats = orgs.map(org => ({
      ...org,
      owner: org.memberships[0]?.user || null,
      totalRevenue: 0, // This would be calculated from actual payment data
      lastActivity: org.createdAt // This would be calculated from audit logs
    }))
  }

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
      title="Organizations"
      breadcrumbs={[{ href: '/owner/orgs', label: 'Organizations' }]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Organizations</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Manage all organizations on your platform.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </Button>
        </div>

        <AllOrgsTable orgs={orgsWithStats} />
      </div>
    </Page>
  )
}
