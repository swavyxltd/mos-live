import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { ExternalLink, Users, AlertTriangle } from 'lucide-react'

interface Org {
  id: string
  name: string
  slug: string
  createdAt: Date
  _count: {
    students: number
    invoices: number
  }
  platformBilling: {
    stripeCustomerId: string
  } | null
}

interface OwnerOrgsTableProps {
  orgs: Org[]
}

export function OwnerOrgsTable({ orgs }: OwnerOrgsTableProps) {
  if (orgs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No organizations found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Organizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stripe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {org.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {org.slug}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      {org._count.students}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org._count.invoices > 0 ? (
                      <div className="flex items-center text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {org._count.invoices}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(org.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org.platformBilling ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Not Connected
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {org.platformBilling && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${org.platformBilling.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
