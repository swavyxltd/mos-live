import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OrganizationDetailModal } from '@/components/organization-detail-modal'
import { ExternalLink, Users, GraduationCap, AlertTriangle, Eye, Settings, UserCheck } from 'lucide-react'

interface OrgWithStats {
  id: string
  name: string
  slug: string
  timezone?: string
  createdAt: Date
  updatedAt?: Date
  owner: {
    name: string | null
    email: string | null
  } | null
  _count: {
    students: number
    classes: number
    memberships: number
    invoices: number
    teachers: number
  }
  platformBilling: {
    stripeCustomerId: string
    status: string
    currentPeriodEnd?: Date
  } | null
  totalRevenue: number
  lastActivity: Date
}

interface AllOrgsTableProps {
  orgs: OrgWithStats[]
  onRefresh?: () => void
}

export function AllOrgsTable({ orgs, onRefresh }: AllOrgsTableProps) {
  const [selectedOrg, setSelectedOrg] = useState<OrgWithStats | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleViewOrg = (org: OrgWithStats) => {
    setSelectedOrg(org)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOrg(null)
  }

  const handleSettings = (org: OrgWithStats) => {
    // Open the organization detail modal in settings tab
    setSelectedOrg(org)
    setIsModalOpen(true)
    // Note: The modal will open in overview tab by default
    // In a real implementation, you might want to pass a prop to open directly to settings
  }

  if (orgs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
          <p className="text-gray-500 mb-4">Organizations will appear here once they sign up.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Organizations ({orgs.length})</CardTitle>
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
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
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
                        <button
                          onClick={() => handleViewOrg(org)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                        >
                          {org.name}
                        </button>
                        <div className="text-sm text-gray-500">
                          {org.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.owner ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {org.owner.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {org.owner.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No owner</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {org._count.students}
                        </div>
                        <div className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-1" />
                          {org._count.teachers || 0}
                        </div>
                        <div className="flex items-center">
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {org._count.classes}
                        </div>
                        {org._count.invoices > 0 && (
                          <div className="flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {org._count.invoices}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(org.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.platformBilling ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Setup Required
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrg(org)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSettings(org)}
                          title="Settings"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {org.platformBilling && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${org.platformBilling.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="View in Stripe Dashboard"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <OrganizationDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        organization={selectedOrg}
        onRefresh={onRefresh}
      />
    </>
  )
}
