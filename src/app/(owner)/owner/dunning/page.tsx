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

  // Get organizations with overdue invoices (billing failures)
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'OVERDUE',
      dueDate: { lt: new Date() }
    },
    include: {
      org: {
        include: {
          memberships: {
            where: { role: 'ADMIN' },
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          },
          _count: {
            select: {
              students: { where: { isArchived: false } }
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
        id: invoice.org.id,
        name: invoice.org.name,
        owner: invoice.org.memberships[0]?.user || null,
        studentCount: invoice.org._count.students,
        stripeCustomerId: invoice.org.platformBilling?.stripeCustomerId || null,
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dunning Management</h1>
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
