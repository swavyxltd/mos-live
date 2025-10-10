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

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let feesPlans: any[] = []

  if (isDemoMode()) {
    // Demo fees data
    feesPlans = [
      {
        id: 'demo-fees-1',
        name: 'Monthly Tuition Fee',
        description: 'Standard monthly tuition for all students',
        amount: 50.00,
        currency: 'GBP',
        billingCycle: 'MONTHLY',
        isActive: true,
        studentCount: 47,
        createdAt: new Date('2024-09-01T00:00:00.000Z'),
        updatedAt: new Date('2024-12-06T00:00:00.000Z')
      },
      {
        id: 'demo-fees-2',
        name: 'Registration Fee',
        description: 'One-time registration fee for new students',
        amount: 25.00,
        currency: 'GBP',
        billingCycle: 'ONE_TIME',
        isActive: true,
        studentCount: 5,
        createdAt: new Date('2024-09-01T00:00:00.000Z'),
        updatedAt: new Date('2024-12-06T00:00:00.000Z')
      },
      {
        id: 'demo-fees-3',
        name: 'Exam Fee',
        description: 'End of term examination fee',
        amount: 15.00,
        currency: 'GBP',
        billingCycle: 'TERMLY',
        isActive: true,
        studentCount: 47,
        createdAt: new Date('2024-09-01T00:00:00.000Z'),
        updatedAt: new Date('2024-12-06T00:00:00.000Z')
      }
    ]
  }

  return <FeesPageClient initialFees={feesPlans} />
}
