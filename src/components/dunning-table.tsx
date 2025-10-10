import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExternalLink, Mail, RotateCcw, AlertTriangle } from 'lucide-react'

interface BillingFailure {
  id: string
  name: string
  owner: {
    name: string | null
    email: string | null
  } | null
  studentCount: number
  stripeCustomerId: string
  lastFailureDate: Date
  failureReason: string
  retryCount: number
  amount: number
}

interface DunningTableProps {
  failures: BillingFailure[]
}

const failureReasonLabels: Record<string, string> = {
  'insufficient_funds': 'Insufficient Funds',
  'card_declined': 'Card Declined',
  'expired_card': 'Expired Card',
  'processing_error': 'Processing Error'
}

const failureReasonColors: Record<string, string> = {
  'insufficient_funds': 'bg-yellow-100 text-yellow-800',
  'card_declined': 'bg-red-100 text-red-800',
  'expired_card': 'bg-orange-100 text-orange-800',
  'processing_error': 'bg-gray-100 text-gray-800'
}

export function DunningTable({ failures }: DunningTableProps) {
  if (failures.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No billing failures</h3>
          <p className="text-gray-500">All organizations are up to date with their payments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Failures ({failures.length})</CardTitle>
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
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Failure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {failures.map((failure) => (
                <tr key={failure.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {failure.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {failure.studentCount} students
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {failure.owner ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {failure.owner.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {failure.owner.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No owner</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(failure.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant="secondary" 
                      className={failureReasonColors[failure.failureReason] || 'bg-gray-100 text-gray-800'}
                    >
                      {failureReasonLabels[failure.failureReason] || failure.failureReason}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <RotateCcw className="h-4 w-4 mr-2 text-gray-400" />
                      {failure.retryCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(failure.lastFailureDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <a
                        href={`https://dashboard.stripe.com/customers/${failure.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
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
