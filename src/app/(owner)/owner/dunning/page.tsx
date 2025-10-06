import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DunningTable } from '@/components/dunning-table'
import { DunningStats } from '@/components/dunning-stats'

export default async function OwnerDunningPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let billingFailures: any[] = []
  let totalFailures = 0
  let totalAmount = 0
  let avgRetryCount = 0

  if (isDemoMode()) {
    // Demo billing failure data
    billingFailures = [
      {
        id: 'demo-org-3',
        name: 'Birmingham Quran Academy',
        owner: {
          name: 'Omar Khan',
          email: 'teacher@demo.com'
        },
        studentCount: 10,
        stripeCustomerId: 'cus_demo_birmingham',
        lastFailureDate: new Date('2024-12-03'),
        failureReason: 'insufficient_funds',
        retryCount: 3,
        amount: 15000
      },
      {
        id: 'demo-org-4',
        name: 'Leeds Islamic School',
        owner: {
          name: 'Sarah Ahmed',
          email: 'sarah@leeds-islamic.edu'
        },
        studentCount: 8,
        stripeCustomerId: 'cus_demo_leeds',
        lastFailureDate: new Date('2024-12-01'),
        failureReason: 'card_declined',
        retryCount: 2,
        amount: 12000
      }
    ]

    // Calculate dunning stats
    totalFailures = billingFailures.length
    totalAmount = billingFailures.reduce((sum, failure) => sum + failure.amount, 0)
    avgRetryCount = billingFailures.reduce((sum, failure) => sum + failure.retryCount, 0) / totalFailures || 0
  } else {
    // Get organizations with billing issues from database
    const orgsWithBillingIssues = await prisma.org.findMany({
      where: {
        platformBilling: {
          isNot: null
        }
      },
      include: {
        platformBilling: true,
        memberships: {
          where: { role: 'OWNER' },
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Mock billing failure data (in real app, this would come from Stripe webhooks)
    billingFailures = orgsWithBillingIssues.map(org => ({
      id: org.id,
      name: org.name,
      owner: org.memberships[0]?.user || null,
      studentCount: org._count.students,
      stripeCustomerId: org.platformBilling?.stripeCustomerId || '',
      lastFailureDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
      failureReason: Math.random() > 0.5 ? 'insufficient_funds' : 'card_declined',
      retryCount: Math.floor(Math.random() * 5),
      amount: 5000 + (org._count.students * 1000) // Mock amount based on student count
    }))

    // Calculate dunning stats
    totalFailures = billingFailures.length
    totalAmount = billingFailures.reduce((sum, failure) => sum + failure.amount, 0)
    avgRetryCount = billingFailures.reduce((sum, failure) => sum + failure.retryCount, 0) / totalFailures || 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dunning Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage billing failures across your platform.
        </p>
      </div>

      <DunningStats
        totalFailures={totalFailures}
        totalAmount={totalAmount}
        avgRetryCount={avgRetryCount}
      />

      <DunningTable failures={billingFailures} />
    </div>
  )
}
