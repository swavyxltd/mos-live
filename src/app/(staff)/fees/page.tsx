import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

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
        applicableClasses: ['Quran Recitation - Level 1', 'Islamic Studies - Level 2'],
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06')
      },
      {
        id: 'demo-fees-2',
        name: 'Registration Fee',
        description: 'One-time registration fee for new students',
        amount: 25.00,
        currency: 'GBP',
        billingCycle: 'ONE_TIME',
        isActive: true,
        applicableClasses: ['All Classes'],
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06')
      },
      {
        id: 'demo-fees-3',
        name: 'Exam Fee',
        description: 'End of term examination fee',
        amount: 15.00,
        currency: 'GBP',
        billingCycle: 'TERMLY',
        isActive: true,
        applicableClasses: ['All Classes'],
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06')
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage fee plans and pricing for your organization.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Fee Plan
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Cycle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicable Classes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feesPlans.map((fee) => (
                  <tr key={fee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {fee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {fee.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      £{fee.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fee.billingCycle.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        fee.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {fee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Array.isArray(fee.applicableClasses) 
                        ? fee.applicableClasses.join(', ')
                        : fee.applicableClasses
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
