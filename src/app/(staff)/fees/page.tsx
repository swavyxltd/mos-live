import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { FeesPageClient } from '@/components/fees-page-client'

export default async function FeesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  // Get fees from database
  const feesPlans = await prisma.fee.findMany({
    where: {
      orgId: org.id
    },
    include: {
      _count: {
        select: {
          invoices: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Transform fees data for frontend
  const transformedFees = feesPlans.map(fee => ({
    id: fee.id,
    name: fee.name,
    description: fee.description || '',
    amount: Number(fee.amountP) / 100,
    currency: fee.currency || 'GBP',
    billingCycle: fee.billingCycle || 'MONTHLY',
    isActive: fee.isActive,
    studentCount: fee._count.invoices,
    createdAt: fee.createdAt,
    updatedAt: fee.updatedAt
  }))

  return <FeesPageClient initialFees={transformedFees} />
}
