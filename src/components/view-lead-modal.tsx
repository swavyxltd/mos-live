'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  X as CloseIcon,
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  FileText,
  RefreshCw,
  Clock,
  Building2,
  ExternalLink,
  Edit,
  CheckCircle,
  XCircle,
  Send,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { LeadEmailComposerModal } from '@/components/lead-email-composer-modal'
import { ConvertLeadModal } from '@/components/convert-lead-modal'
import { LogCallModal } from '@/components/log-call-modal'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

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
  source: string | null
  lastContactAt: string | null
  nextContactAt: string | null
  notes: string | null
  assignedToUserId: string | null
  convertedOrgId: string | null
  lastEmailSentAt: string | null
  lastEmailStage: string | null
  emailOutreachCompleted: boolean
  AssignedTo: {
    id: string
    name: string | null
    email: string | null
  } | null
  ConvertedOrg: {
    id: string
    name: string
    slug: string
  } | null
  Activities: Array<{
    id: string
    type: string
    description: string
    outcome?: string | null
    createdAt: string
    CreatedBy: {
      id: string
      name: string | null
      email: string | null
    } | null
  }>
}

interface ViewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (leadData: any) => void
  leadId: string | null
  onEdit?: () => void
  autoOpenLogCall?: boolean
}

export function ViewLeadModal({ isOpen, onClose, onUpdate, leadId, onEdit, autoOpenLogCall }: ViewLeadModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lead, setLead] = useState<Lead | null>(null)
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState<string>('Madrasah OS')
  
  // Activity form state
  const [activityType, setActivityType] = useState('NOTE')
  const [activityDescription, setActivityDescription] = useState('')
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  
  // Email composer state
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false)
  
  // Convert to org modal state
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)
  
  // Log call modal state
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Resend invitation state
  const [isResendingInvite, setIsResendingInvite] = useState(false)

  useEffect(() => {
    if (isOpen && leadId) {
      loadLead()
      loadCalendlyUrl()
      
      // Check for query param or prop to auto-open log call modal
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('open') === 'log-call') {
          setIsLogCallModalOpen(true)
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
      // Also check prop
      if (autoOpenLogCall) {
        setIsLogCallModalOpen(true)
      }
    }
  }, [isOpen, leadId])

  const loadLead = async () => {
    if (!leadId) {
      console.error('No leadId provided to loadLead')
      return
    }
    
    console.log('Loading lead with ID:', leadId)
    setIsLoading(true)
    try {
      const url = `/api/owner/leads/${leadId}`
      console.log('Fetching from URL:', url)
      const res = await fetch(url)
      console.log('Response status:', res.status, res.statusText)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Failed to load lead (${res.status})`
        console.error('Failed to fetch lead:', {
          leadId,
          url,
          status: res.status,
          statusText: res.statusText,
          error: errorData,
          headers: Object.fromEntries(res.headers.entries())
        })
        throw new Error(errorMessage)
      }
      const data = await res.json()
      console.log('Received lead data:', data)
      if (!data.lead) {
        console.error('No lead in response data:', data)
        throw new Error('Lead data not found in response')
      }
      setLead(data.lead)
    } catch (error: any) {
      console.error('Error loading lead:', error)
      toast.error(error.message || 'Failed to load lead')
      setLead(null) // Clear lead state on error
    } finally {
      setIsLoading(false)
    }
  }

  const loadCalendlyUrl = async () => {
    try {
      const res = await fetch('/api/owner/settings')
      if (res.ok) {
        const data = await res.json()
        setCalendlyUrl(data.ownerCalendlyUrl || null)
      }
    } catch (error) {
      console.error('Error loading Calendly URL:', error)
    }
  }

  useEffect(() => {
    if (isOpen && leadId) {
      // Get owner name from session or use default
      // This could be enhanced to fetch from user profile
      setOwnerName('Madrasah OS')
    }
  }, [isOpen, leadId])

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!leadId) return

    try {
      const res = await fetch(`/api/owner/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          createStatusChangeActivity: true,
        }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      await loadLead()
      onUpdate({})
      toast.success('Status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSetFollowUp = async (days: number) => {
    if (!leadId) return

    const date = new Date()
    date.setDate(date.getDate() + days)
    const dateStr = date.toISOString().split('T')[0]

    try {
      const res = await fetch(`/api/owner/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextContactAt: dateStr,
        }),
      })
      if (!res.ok) throw new Error('Failed to set follow-up')
      await loadLead()
      onUpdate({})
      toast.success(`Follow-up set for ${days} day${days !== 1 ? 's' : ''} from now`)
    } catch (error) {
      console.error('Error setting follow-up:', error)
      toast.error('Failed to set follow-up')
    }
  }

  const handleAddActivity = async () => {
    if (!leadId || !activityDescription.trim()) {
      toast.error('Please enter a description')
      return
    }

    setIsAddingActivity(true)
    try {
      const res = await fetch(`/api/owner/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activityType,
          description: activityDescription,
          updateLastContactAt: ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING'].includes(activityType),
        }),
      })
      if (!res.ok) throw new Error('Failed to add activity')
      setActivityDescription('')
      await loadLead()
      onUpdate({})
      toast.success('Activity added')
    } catch (error) {
      console.error('Error adding activity:', error)
      toast.error('Failed to add activity')
    } finally {
      setIsAddingActivity(false)
    }
  }

  const handleConvertSuccess = (orgId: string) => {
    onUpdate({})
    onClose()
    // Navigate to the organizations list page
    window.location.href = `/owner/orgs`
  }

  const handleDeleteLead = async () => {
    if (!leadId || !lead) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/owner/leads/${leadId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete lead')
      }
      toast.success(`Lead "${lead.orgName}" deleted successfully`)
      setIsDeleteDialogOpen(false)
      onUpdate({})
      onClose()
      // Refresh the page to update the leads list
      window.location.reload()
    } catch (error: any) {
      console.error('Error deleting lead:', error)
      toast.error(error.message || 'Failed to delete lead')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResendInvite = async () => {
    if (!lead?.convertedOrgId) return

    setIsResendingInvite(true)
    try {
      const res = await fetch(`/api/owner/orgs/${lead.convertedOrgId}/resend-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await res.text()
      let errorData: any = {}
      let data: any = null
      
      try {
        if (responseText) {
          data = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError, 'Response:', responseText.substring(0, 200))
      }
      
      if (!res.ok) {
        errorData = data || {}
        // Use the more detailed message if available
        const errorMessage = errorData.message || errorData.error || `Failed to resend invitation (${res.status} ${res.statusText})`
        console.error('Error resending invitation:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
          responseText: responseText.substring(0, 200),
          message: errorMessage
        })
        throw new Error(errorMessage)
      }

      // Success case
      if (data) {
        toast.success(data.message || 'Invitation resent successfully')
      } else {
        toast.success('Invitation resent successfully')
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error)
      // Show the error message from the API, or a fallback
      const errorMessage = error.message || 'Failed to resend invitation. Please check the console for details.'
      toast.error(errorMessage)
    } finally {
      setIsResendingInvite(false)
    }
  }

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatActivityType = (type: string) => {
    return type
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

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      CALL: Phone,
      WHATSAPP: MessageSquare,
      EMAIL: Mail,
      MEETING: Calendar,
      NOTE: FileText,
      STATUS_CHANGE: RefreshCw,
    }
    return icons[type] || FileText
  }

  const getEmailStageLabel = (stage: string | null) => {
    if (!stage) return 'No email sent yet'
    const labels: Record<string, string> = {
      INITIAL: 'Initial',
      FOLLOW_UP_1: 'Follow-up 1',
      FOLLOW_UP_2: 'Follow-up 2',
      FINAL: 'Final',
    }
    return labels[stage] || stage
  }

  const getEmailButtonLabel = () => {
    if (lead?.emailOutreachCompleted) {
      return 'Email outreach complete'
    }
    if (!lead?.lastEmailStage) {
      return 'Send initial email'
    }
    if (lead.lastEmailStage === 'INITIAL') {
      return 'Send follow-up email'
    }
    if (lead.lastEmailStage === 'FOLLOW_UP_1') {
      return 'Send second follow-up'
    }
    if (lead.lastEmailStage === 'FOLLOW_UP_2') {
      return 'Send final follow-up'
    }
    if (lead.lastEmailStage === 'FINAL') {
      return 'Send custom email'
    }
    return 'Send email'
  }

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="View Lead">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Modal>
    )
  }

  if (!lead) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="View Lead">
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Lead not found</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={lead.orgName}
    >
      <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-120px)]">
        {/* Header: Status and Edit */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={getStatusColor(lead.status)}>
              {formatStatus(lead.status)}
            </Badge>
            {lead.convertedOrgId && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Converted
              </Badge>
            )}
            {lead.Activities.some(a => a.type === 'CALL' && (a as any).outcome === 'Wrong number') && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                ⚠️ Wrong number
              </Badge>
            )}
            {lead.Activities.some(a => a.type === 'CALL' && (a as any).outcome === 'Spoke – interested') && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                ✓ Warm lead
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Key Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          {lead.contactName && (
            <div>
              <Label className="text-xs text-muted-foreground">Contact</Label>
              <p className="text-sm font-medium mt-1">{lead.contactName}</p>
            </div>
          )}
          {lead.contactEmail && (
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm mt-1 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.contactEmail}
              </p>
            </div>
          )}
          {lead.contactPhone && (
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <p className="text-sm mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.contactPhone}
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <p className="text-sm mt-1">
              {lead.city ? `${lead.city}, ${lead.country}` : lead.country}
            </p>
          </div>
          {lead.nextContactAt && (
            <div>
              <Label className="text-xs text-muted-foreground">Next Follow-up</Label>
              <p className="text-sm mt-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(lead.nextContactAt)}
              </p>
            </div>
          )}
          {lead.lastContactAt && (
            <div>
              <Label className="text-xs text-muted-foreground">Last Contact</Label>
              <p className="text-sm mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(lead.lastContactAt)}
              </p>
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Actions</Label>
          <div className="flex flex-wrap gap-2">
            {/* Primary Contact Actions - Both Black */}
            {lead.contactEmail && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsEmailComposerOpen(true)}
                disabled={lead.emailOutreachCompleted}
                className="flex-1 min-w-0"
              >
                <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{getEmailButtonLabel()}</span>
              </Button>
            )}
            {lead.contactPhone && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsLogCallModalOpen(true)}
                className="flex-1 min-w-0"
              >
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Log Call</span>
              </Button>
            )}

            {/* Mark Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                >
                  <span className="truncate">Mark Status</span>
                  <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => handleQuickStatusChange('CONTACTED')}>
                  Mark Contacted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickStatusChange('WON')}>
                  Mark Won
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickStatusChange('LOST')}>
                  Mark Lost
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Follow-up Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 min-w-0"
                >
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Follow-up</span>
                  <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => handleSetFollowUp(3)}>
                  In 3 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetFollowUp(7)}>
                  In 1 week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetFollowUp(14)}>
                  In 2 weeks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSetFollowUp(30)}>
                  In 1 month
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex flex-wrap gap-2">
            {calendlyUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = new URL(calendlyUrl)
                  if (lead.contactName) url.searchParams.set('name', lead.contactName)
                  if (lead.contactEmail) url.searchParams.set('email', lead.contactEmail)
                  window.open(url.toString(), '_blank')
                }}
                className="justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Book Demo
              </Button>
            )}

            {!lead.convertedOrgId ? (
              <Button
                size="sm"
                onClick={() => setIsConvertModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 justify-start"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Convert to Organisation
              </Button>
            ) : lead.ConvertedOrg ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.href = `/owner/orgs`
                  }}
                  className="justify-start"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Organisation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendInvite}
                  disabled={isResendingInvite}
                  className="justify-start"
                >
                  {isResendingInvite ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invite
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Additional Info */}
        {(lead.estimatedStudents || lead.source || lead.AssignedTo || lead.notes) && (
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Additional Information</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {lead.estimatedStudents && (
                <div>
                  <span className="text-muted-foreground">Est. Students: </span>
                  <span className="font-medium">{lead.estimatedStudents}</span>
                </div>
              )}
              {lead.source && (
                <div>
                  <span className="text-muted-foreground">Source: </span>
                  <span className="font-medium">{lead.source}</span>
                </div>
              )}
              {lead.AssignedTo && (
                <div>
                  <span className="text-muted-foreground">Assigned To: </span>
                  <span className="font-medium">{lead.AssignedTo.name || lead.AssignedTo.email}</span>
                </div>
              )}
            </div>
            {lead.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded">{lead.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Email Status (if email exists) */}
        {lead.contactEmail && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {lead.lastEmailSentAt ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Last email: {getEmailStageLabel(lead.lastEmailStage)} on {formatDate(lead.lastEmailSentAt)}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                  No email sent yet
                </Badge>
              )}
              {lead.emailOutreachCompleted && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Outreach Complete
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Activity Timeline</Label>
              <p className="text-xs text-muted-foreground mt-1">
                All interactions and updates
              </p>
            </div>
          </div>

          {/* Add Activity Form - Simplified */}
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="flex gap-2">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">Note</SelectItem>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                className="flex-1"
                rows={1}
                placeholder="Add a note..."
              />
              <Button 
                onClick={handleAddActivity} 
                size="sm"
                disabled={isAddingActivity || !activityDescription.trim()}
              >
                {isAddingActivity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>

          {/* Activities List */}
          {lead.Activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activities yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {lead.Activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const activityWithOutcome = activity as any
                const isCallWithOutcome = activity.type === 'CALL' && activityWithOutcome.outcome
                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {isCallWithOutcome 
                            ? `Call attempt: ${activityWithOutcome.outcome}`
                            : formatActivityType(activity.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm break-words">{activity.description}</p>
                      {activity.CreatedBy && (
                        <p className="text-xs text-muted-foreground mt-1">
                          by {activity.CreatedBy.name || activity.CreatedBy.email}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Email Composer Modal */}
      {lead && (
        <LeadEmailComposerModal
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          onSent={() => {
            loadLead()
            onUpdate({})
          }}
          lead={lead}
          ownerName={ownerName}
          calendlyUrl={calendlyUrl}
        />
      )}

      {/* Convert Lead Modal */}
      {lead && (
        <ConvertLeadModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          onSuccess={handleConvertSuccess}
          leadId={lead.id}
          leadName={lead.orgName}
          defaultEmail={lead.contactEmail}
        />
      )}
      
      {/* Log Call Modal */}
      {lead && (
        <LogCallModal
          isOpen={isLogCallModalOpen}
          onClose={() => setIsLogCallModalOpen(false)}
          onSaved={() => {
            loadLead()
            onUpdate({})
          }}
          leadId={lead.id}
          leadPhone={lead.contactPhone}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteLead}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead?.orgName}"? This action cannot be undone and will also delete all associated activities.`}
        confirmText="Delete Lead"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
      />
    </Modal>
  )
}

