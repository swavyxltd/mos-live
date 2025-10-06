import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let invoices: any[] = []

  if (isDemoMode()) {
    // Demo invoices data
    invoices = [
      {
        id: 'demo-invoice-1',
        invoiceNumber: 'INV-2024-001',
        studentName: 'Ahmed Hassan',
        parentName: 'Mohammed Hassan',
        parentEmail: 'mohammed.hassan@example.com',
        amount: 50.00,
        currency: 'GBP',
        status: 'PAID',
        dueDate: new Date('2024-12-01'),
        paidDate: new Date('2024-11-28'),
        items: [
          { description: 'Monthly Tuition Fee - December 2024', amount: 50.00 }
        ],
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-11-28')
      },
      {
        id: 'demo-invoice-2',
        invoiceNumber: 'INV-2024-002',
        studentName: 'Fatima Ali',
        parentName: 'Aisha Ali',
        parentEmail: 'aisha.ali@example.com',
        amount: 75.00,
        currency: 'GBP',
        status: 'OVERDUE',
        dueDate: new Date('2024-12-01'),
        paidDate: null,
        items: [
          { description: 'Monthly Tuition Fee - December 2024', amount: 50.00 },
          { description: 'Exam Fee - Term 1', amount: 15.00 },
          { description: 'Late Payment Fee', amount: 10.00 }
        ],
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-06')
      },
      {
        id: 'demo-invoice-3',
        invoiceNumber: 'INV-2024-003',
        studentName: 'Yusuf Patel',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@example.com',
        amount: 25.00,
        currency: 'GBP',
        status: 'PENDING',
        dueDate: new Date('2024-12-15'),
        paidDate: null,
        items: [
          { description: 'Registration Fee', amount: 25.00 }
        ],
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-01')
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student invoices and payments.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Generate Invoices
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invoice.parentName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      £{invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'PAID' 
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.dueDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          View
                        </button>
                        {invoice.status !== 'PAID' && (
                          <button className="text-green-600 hover:text-green-900">
                            Record Payment
                          </button>
                        )}
                      </div>
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
