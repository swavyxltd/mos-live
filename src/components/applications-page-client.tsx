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
import { TableSkeleton } from '@/components/loading/skeleton'

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
          status: app.status || 'NEW',
          guardianName: app.guardianName || '',
          guardianPhone: app.guardianPhone || '',
          guardianEmail: app.guardianEmail || '',
          submittedAt: app.submittedAt || app.createdAt || new Date().toISOString(),
          children: (app.ApplicationChild || []).map((child: any) => ({
            firstName: child.firstName || '',
            lastName: child.lastName || '',
            dob: child.dob ? (typeof child.dob === 'string' ? child.dob : child.dob.toISOString().split('T')[0]) : undefined,
            gender: child.gender || ''
          })),
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
      const childNames = app.children.map(c => `${c.firstName} ${c.lastName}`).join(' ').toLowerCase()
      const matchesSearch = 
        app.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.guardianEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.guardianPhone.includes(searchTerm) ||
        childNames.includes(searchTerm.toLowerCase())
      
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
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
            <div className="h-10 w-24 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse" />
          </div>
        </div>
        <TableSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Applications</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
            Manage student applications for your madrasah.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCopyLinkModal(true)}
            className="w-full sm:w-auto text-sm sm:text-base"
            size="sm"
          >
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="sm:hidden">Copy Link</span>
            <span className="hidden sm:inline">Copy Application Link</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/apply/${orgSlug}`, '_blank')}
            className="w-full sm:w-auto text-sm sm:text-base"
            size="sm"
          >
            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="sm:hidden">View Form</span>
            <span className="hidden sm:inline">View Public Form</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search by guardian name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
        </div>
        
        {/* Status Filter Buttons and Date Filter */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className={`transition-all ${
                statusFilter === 'ALL' 
                  ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)] shadow-[var(--shadow-xs)] font-semibold' 
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] hover:border-[var(--foreground)]/20'
              }`}
            >
              All Statuses
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('NEW')}
              className={`transition-all ${
                statusFilter === 'NEW' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-[var(--shadow-xs)] font-semibold dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' 
                  : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950'
              }`}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              New
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('REVIEWED')}
              className={`transition-all ${
                statusFilter === 'REVIEWED' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-[var(--shadow-xs)] font-semibold dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' 
                  : 'border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950'
              }`}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Reviewed
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`transition-all ${
                statusFilter === 'ACCEPTED' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[var(--shadow-xs)] font-semibold dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' 
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950'
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Accepted
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('REJECTED')}
              className={`transition-all ${
                statusFilter === 'REJECTED' 
                  ? 'bg-red-50 text-red-700 border-red-200 shadow-[var(--shadow-xs)] font-semibold dark:bg-red-950 dark:text-red-300 dark:border-red-800' 
                  : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
              }`}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Rejected
            </Button>
          </div>
          
          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)] whitespace-nowrap">Sort by:</label>
            <Select
              value={dateFilter}
              onValueChange={(value: 'MOST_RECENT' | 'OLDEST') => setDateFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-40 text-sm sm:text-base h-9 sm:h-10">
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
      <div className="space-y-3 sm:space-y-4">
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
              className="p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleApplicationClick(application)}
            >
              <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] truncate">
                        {application.children.length > 0 
                          ? application.children.map(c => `${c.firstName} ${c.lastName}`).join(', ')
                          : 'No child name'}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5 sm:mt-0 break-words">
                        Parent: {application.guardianName}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5 break-words">
                        {application.guardianEmail} • {application.guardianPhone}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-1">
                        {application.children.length} child{application.children.length !== 1 ? 'ren' : ''} • 
                        Submitted {new Date(application.submittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:space-x-4 flex-shrink-0">
                  {getStatusBadge(application.status)}
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--muted-foreground)]" />
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

