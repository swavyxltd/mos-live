import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DunningTable } from '@/components/dunning-table'
import { DunningStats } from '@/components/dunning-stats'
import { Skeleton, StatCardSkeleton, CardSkeleton, TableSkeleton } from '@/components/loading/skeleton'

export default async function OwnerDunningPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Table Skeleton */}
        <TableSkeleton rows={8} />
      </div>
    )
  }

  // Get organisations with overdue invoices (billing failures)
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'OVERDUE',
      dueDate: { lt: new Date() }
    },
    include: {
      Org: {
        include: {
          UserOrgMembership: {
            where: { role: 'ADMIN' },
            include: {
              User: {
                select: { name: true, email: true }
              }
            }
          },
          PlatformOrgBilling: {
            select: {
              stripeCustomerId: true
            }
          },
          _count: {
            select: {
              Student: { where: { isArchived: false } }
            }
          }
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  })

  // Group by org and get latest failure
  const orgFailures = new Map<string, any>()
  
  for (const invoice of overdueInvoices) {
    const orgId = invoice.orgId
    if (!orgFailures.has(orgId)) {
      orgFailures.set(orgId, {
        id: invoice.Org.id,
        name: invoice.Org.name,
        owner: invoice.Org.UserOrgMembership[0]?.User || null,
        studentCount: invoice.Org._count.Student,
        stripeCustomerId: invoice.Org.platformBilling?.stripeCustomerId || null,
        lastFailureDate: invoice.dueDate,
        failureReason: 'payment_overdue',
        retryCount: 0,
        amount: Number(invoice.amountP || 0) / 100
      })
    } else {
      const existing = orgFailures.get(orgId)!
      existing.amount += Number(invoice.amountP || 0) / 100
      if (invoice.dueDate > existing.lastFailureDate) {
        existing.lastFailureDate = invoice.dueDate
      }
    }
  }

  const billingFailures = Array.from(orgFailures.values())

  // Calculate dunning stats
  const totalFailures = billingFailures.length
  const totalAmount = billingFailures.reduce((sum, failure) => sum + failure.amount, 0)
  const avgRetryCount = billingFailures.reduce((sum, failure) => sum + failure.retryCount, 0) / totalFailures || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Dunning Management</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
