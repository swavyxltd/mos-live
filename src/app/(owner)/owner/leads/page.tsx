'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddLeadModal } from '@/components/add-lead-modal'
import { EditLeadModal } from '@/components/edit-lead-modal'
import { ViewLeadModal } from '@/components/view-lead-modal'
import { 
  Target,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Calendar,
  MapPin,
  Users,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Lead {
  id: string
  orgName: string
  city: string | null
  country: string
  estimatedStudents: number | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  status: string
  lastContactAt: string | null
  nextContactAt: string | null
  AssignedTo: {
    id: string
    name: string | null
    email: string | null
  } | null
  _count: {
    Activities: number
  }
}

export default function LeadsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>('createdAt_desc')
  const [showWonOnly, setShowWonOnly] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      router.push('/auth/signin')
      return
    }
    loadLeads()
  }, [session, status, router, statusFilter, assignedFilter, cityFilter, sortBy, showWonOnly])

  const loadLeads = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (showWonOnly) {
        // If showing won only, set status to WON
        params.append('status', 'WON')
      } else {
        // By default, exclude WON status
        params.append('excludeStatus', 'WON')
        if (statusFilter !== 'all') params.append('status', statusFilter)
      }
      if (assignedFilter !== 'all') params.append('assignedTo', assignedFilter)
      if (cityFilter) params.append('city', cityFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (sortBy) params.append('sortBy', sortBy)

      const res = await fetch(`/api/owner/leads?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load leads (${res.status})`)
      }
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error: any) {
      console.error('Error loading leads:', error)
      toast.error(error.message || 'Failed to load leads')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    loadLeads()
  }

  const handleAddLead = (leadData: any) => {
    loadLeads()
    setIsAddModalOpen(false)
  }

  const handleViewLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    setIsViewModalOpen(true)
  }

  const handleEditLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    setIsEditModalOpen(true)
  }

  const handleUpdateLead = () => {
    loadLeads()
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700',
      CONTACTED: 'bg-yellow-100 text-yellow-700',
      FOLLOW_UP: 'bg-orange-100 text-orange-700',
      DEMO_BOOKED: 'bg-purple-100 text-purple-700',
      WON: 'bg-green-100 text-green-700',
      LOST: 'bg-red-100 text-red-700',
      ON_HOLD: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start w-full min-w-0">
        <div className="flex-1 min-w-0 pr-0 md:pr-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] break-words">
            Leads
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] break-words">
            Track and manage madrasah leads
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <Button
            size="sm"
            onClick={() => router.push('/owner/leads/dashboard')}
            variant="outline"
            className="flex-1 md:flex-initial"
          >
            <span className="hidden md:inline">Dashboard</span>
            <span className="md:hidden">Dashboard</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-initial"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Add Lead</span>
            <span className="md:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="DEMO_BOOKED">Demo Booked</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="City"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt_desc">Newest First</SelectItem>
                <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                <SelectItem value="orgName_asc">Name (A-Z)</SelectItem>
                <SelectItem value="orgName_desc">Name (Z-A)</SelectItem>
                <SelectItem value="nextContactAt_asc">Next Follow-up (Earliest)</SelectItem>
                <SelectItem value="nextContactAt_desc">Next Follow-up (Latest)</SelectItem>
                <SelectItem value="lastContactAt_desc">Last Contact (Recent)</SelectItem>
                <SelectItem value="lastContactAt_asc">Last Contact (Oldest)</SelectItem>
                <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                <SelectItem value="status_desc">Status (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setAssignedFilter('all')
                setCityFilter('')
                setSortBy('createdAt_desc')
                setShowWonOnly(false)
                loadLeads()
              }}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
            <Button
              onClick={() => {
                const newShowWonOnly = !showWonOnly
                setShowWonOnly(newShowWonOnly)
                setStatusFilter('all')
                // Clear other filters when toggling
                if (newShowWonOnly) {
                  setSearchTerm('')
                  setCityFilter('')
                  setAssignedFilter('all')
                }
                // loadLeads will be called by useEffect
              }}
              variant={showWonOnly ? "default" : "outline"}
              size="sm"
            >
              {showWonOnly ? 'View All' : 'View Won'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">
            {showWonOnly ? 'Won Leads' : 'All Leads'}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm break-words">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No leads found</p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Lead
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Madrasah Name</TableHead>
                    <TableHead className="hidden md:table-cell">City</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Last Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Next Follow-up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => handleViewLead(lead.id)}
                    >
                      <TableCell className="font-medium">{lead.orgName}</TableCell>
                      <TableCell className="hidden md:table-cell">{lead.city || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.contactName || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(lead.status)}>
                          {formatStatus(lead.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.lastContactAt ? formatDate(lead.lastContactAt) : '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.nextContactAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lead.nextContactAt)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLead(lead.id)}
                            title="View"
                            className="hidden md:flex"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLead(lead.id)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddLead}
      />
      <ViewLeadModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedLeadId(null)
        }}
        onUpdate={handleUpdateLead}
        leadId={selectedLeadId}
        onEdit={() => {
          setIsViewModalOpen(false)
          setIsEditModalOpen(true)
        }}
      />
      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedLeadId(null)
        }}
        onSave={(leadData) => {
          handleUpdateLead()
          setIsEditModalOpen(false)
          setSelectedLeadId(null)
        }}
        leadId={selectedLeadId}
      />
    </div>
  )
}

