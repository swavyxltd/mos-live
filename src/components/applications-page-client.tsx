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
import { PhoneLink } from '@/components/phone-link'

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
        setApplications([])
      }
    } catch (error) {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  // Listen for refresh events to update applications list
  useEffect(() => {
    const handleRefresh = () => {
      fetchApplications()
    }
    
    window.addEventListener('refresh-applications', handleRefresh)
    
    return () => {
      window.removeEventListener('refresh-applications', handleRefresh)
    }
  }, [])

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
            className="w-full sm:w-auto"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Copy Link</span>
            <span className="hidden sm:inline">Copy Application Link</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/apply/${orgSlug}`, '_blank')}
            className="w-full sm:w-auto"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
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
          <div className="flex flex-wrap gap-2 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <Button
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
            >
              All Statuses
            </Button>
            <Button
              variant={statusFilter === 'NEW' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('NEW')}
            >
              <Clock className="h-4 w-4 mr-1.5" />
              New
            </Button>
            <Button
              variant={statusFilter === 'REVIEWED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REVIEWED')}
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Reviewed
            </Button>
            <Button
              variant={statusFilter === 'ACCEPTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ACCEPTED')}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Accepted
            </Button>
            <Button
              variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('REJECTED')}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
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
                        <span className="sm:hidden">
                          <PhoneLink phone={application.guardianPhone} />
                        </span>
                        <span className="hidden sm:inline">
                          {application.guardianEmail} • <PhoneLink phone={application.guardianPhone} />
                        </span>
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
                  <Button variant="ghost" size="sm" className="hidden sm:flex flex-shrink-0">
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

