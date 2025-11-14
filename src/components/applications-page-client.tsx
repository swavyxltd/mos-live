'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react'
import { ApplicationDetailModal } from '@/components/application-detail-modal'
import { CopyApplicationLinkModal } from '@/components/copy-application-link-modal'

interface Application {
  id: string
  status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  submittedAt: string
  children: Array<{
    firstName: string
    lastName: string
    dob?: string
  }>
  preferredClass?: string
  additionalNotes?: string
  adminNotes?: string
}

interface ApplicationsPageClientProps {
  orgSlug: string
}

export function ApplicationsPageClient({ orgSlug }: ApplicationsPageClientProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState<'MOST_RECENT' | 'OLDEST'>('MOST_RECENT')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        // Transform API data to match Application interface
        const transformed = data.map((app: any) => ({
          id: app.id,
          status: app.status,
          guardianName: app.guardianName,
          guardianPhone: app.guardianPhone,
          guardianEmail: app.guardianEmail,
          submittedAt: app.submittedAt,
          children: app.children || [],
          preferredClass: app.preferredClass || '',
          additionalNotes: app.additionalNotes || '',
          adminNotes: app.adminNotes || ''
        }))
        setApplications(transformed)
      } else {
        console.error('Failed to fetch applications')
        setApplications([])
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  // Legacy demo data removed - always use real API data
  const getDemoApplications = (): Application[] => [
    {
      id: '1',
      status: 'NEW',
      guardianName: 'Ahmed Hassan',
      guardianPhone: '+44 7700 900123',
      guardianEmail: 'ahmed.hassan@example.com',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      children: [
        { firstName: 'Hassan', lastName: 'Hassan', dob: '2015-03-15' },
        { firstName: 'Amina', lastName: 'Hassan', dob: '2017-08-22' }
      ],
      preferredClass: 'Quran Recitation',
      additionalNotes: 'Both children are eager to learn and have been practicing at home.',
      adminNotes: ''
    },
    {
      id: '2',
      status: 'REVIEWED',
      guardianName: 'Fatima Ali',
      guardianPhone: '+44 7700 900124',
      guardianEmail: 'fatima.ali@example.com',
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      children: [
        { firstName: 'Yusuf', lastName: 'Ali', dob: '2016-11-10' }
      ],
      preferredClass: 'Islamic Studies',
      additionalNotes: 'Yusuf has been reading Arabic books and is very interested in Islamic history.',
      adminNotes: 'Good candidate - strong academic background. Schedule interview.'
    },
    {
      id: '3',
      status: 'ACCEPTED',
      guardianName: 'Mohammed Khan',
      guardianPhone: '+44 7700 900125',
      guardianEmail: 'mohammed.khan@example.com',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      children: [
        { firstName: 'Aisha', lastName: 'Khan', dob: '2014-07-18' },
        { firstName: 'Omar', lastName: 'Khan', dob: '2018-12-03' }
      ],
      preferredClass: 'Arabic Language',
      additionalNotes: 'Family is very committed to Islamic education. Both parents are teachers.',
      adminNotes: 'Excellent family background. Accepted and enrolled in Arabic Level 1.'
    },
    {
      id: '4',
      status: 'NEW',
      guardianName: 'Sarah Ahmed',
      guardianPhone: '+44 7700 900126',
      guardianEmail: 'sarah.ahmed@example.com',
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      children: [
        { firstName: 'Zainab', lastName: 'Ahmed', dob: '2019-04-25' }
      ],
      preferredClass: 'Quran Memorization',
      additionalNotes: 'Zainab has already memorized several short surahs at home.',
      adminNotes: ''
    },
    {
      id: '5',
      status: 'REJECTED',
      guardianName: 'John Smith',
      guardianPhone: '+44 7700 900127',
      guardianEmail: 'john.smith@example.com',
      submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      children: [
        { firstName: 'Emma', lastName: 'Smith', dob: '2015-09-12' }
      ],
      preferredClass: 'Islamic Studies',
      additionalNotes: 'Looking for a more secular approach to education.',
      adminNotes: 'Not suitable for our Islamic curriculum focus. Recommended alternative schools.'
    }
  ]

  const filteredApplications = applications
    .filter(app => {
      const matchesSearch = 
        app.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.guardianEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.guardianPhone.includes(searchTerm)
      
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime()
      const dateB = new Date(b.submittedAt).getTime()
      
      return dateFilter === 'MOST_RECENT' ? dateB - dateA : dateA - dateB
    })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />New</Badge>
      case 'REVIEWED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>
      case 'ACCEPTED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
      case 'REJECTED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleApplicationClick = (application: Application) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleStatusUpdate = async (applicationId: string, newStatus: string, adminNotes?: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, adminNotes }),
      })

      if (response.ok) {
        await fetchApplications()
        setShowDetailModal(false)
      }
    } catch (error) {
      console.error('Error updating application status:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Applications</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Manage student applications for your madrasah.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading applications...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student applications for your madrasah.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowCopyLinkModal(true)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Application Link
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/apply/${orgSlug}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Public Form
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by guardian name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Status Filter Buttons and Date Filter */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className={`${
                statusFilter === 'ALL' 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Statuses
            </Button>
            <Button
              variant={statusFilter === 'NEW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('NEW')}
              className={`${
                statusFilter === 'NEW' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Clock className="h-4 w-4 mr-1" />
              New
            </Button>
            <Button
              variant={statusFilter === 'REVIEWED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REVIEWED')}
              className={`${
                statusFilter === 'REVIEWED' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
              }`}
            >
              <Eye className="h-4 w-4 mr-1" />
              Reviewed
            </Button>
            <Button
              variant={statusFilter === 'ACCEPTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`${
                statusFilter === 'ACCEPTED' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'border-green-300 text-green-600 hover:bg-green-50'
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Accepted
            </Button>
            <Button
              variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REJECTED')}
              className={`${
                statusFilter === 'REJECTED' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'border-red-300 text-red-600 hover:bg-red-50'
              }`}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejected
            </Button>
          </div>
          
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <Select
              value={dateFilter}
              onValueChange={(value: 'MOST_RECENT' | 'OLDEST') => setDateFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MOST_RECENT">Most Recent</SelectItem>
                <SelectItem value="OLDEST">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              {applications.length === 0 
                ? "No applications have been submitted yet."
                : "No applications match your search criteria."
              }
            </div>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card 
              key={application.id} 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleApplicationClick(application)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {application.guardianName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {application.guardianEmail} • {application.guardianPhone}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {application.children.length} child{application.children.length !== 1 ? 'ren' : ''} • 
                        Submitted {new Date(application.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(application.status)}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setShowDetailModal(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Copy Application Link Modal */}
      {showCopyLinkModal && (
        <CopyApplicationLinkModal
          orgSlug={orgSlug}
          onClose={() => setShowCopyLinkModal(false)}
        />
      )}
    </div>
  )
}
