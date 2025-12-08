'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Users,
  Clock,
  Target,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Skeleton, CardSkeleton } from '@/components/loading/skeleton'

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
    createdAt: string
    CreatedBy: {
      id: string
      name: string | null
      email: string | null
    } | null
  }>
}

export default function LeadDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    orgName: '',
    city: '',
    country: 'UK',
    estimatedStudents: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    source: '',
    status: 'NEW',
    nextContactAt: '',
    notes: '',
    assignedToUserId: '',
  })

  // Activity form state
  const [activityType, setActivityType] = useState('NOTE')
  const [activityDescription, setActivityDescription] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      router.push('/auth/signin')
      return
    }
    loadLead()
    loadCalendlyUrl()
  }, [session, status, router, leadId])

  const loadLead = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/owner/leads/${leadId}`)
      if (!res.ok) throw new Error('Failed to load lead')
      const data = await res.json()
      setLead(data.lead)
      setFormData({
        orgName: data.lead.orgName || '',
        city: data.lead.city || '',
        country: data.lead.country || 'UK',
        estimatedStudents: data.lead.estimatedStudents?.toString() || '',
        contactName: data.lead.contactName || '',
        contactEmail: data.lead.contactEmail || '',
        contactPhone: data.lead.contactPhone || '',
        source: data.lead.source || '',
        status: data.lead.status || 'NEW',
        nextContactAt: data.lead.nextContactAt 
          ? new Date(data.lead.nextContactAt).toISOString().split('T')[0]
          : '',
        notes: data.lead.notes || '',
        assignedToUserId: data.lead.assignedToUserId || '',
      })
    } catch (error) {
      console.error('Error loading lead:', error)
      toast.error('Failed to load lead')
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/owner/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedStudents: formData.estimatedStudents ? parseInt(formData.estimatedStudents) : null,
          nextContactAt: formData.nextContactAt || null,
          createStatusChangeActivity: formData.status !== lead?.status,
        }),
      })
      if (!res.ok) throw new Error('Failed to update lead')
      await loadLead()
      setIsEditing(false)
      toast.success('Lead updated successfully')
    } catch (error) {
      console.error('Error updating lead:', error)
      toast.error('Failed to update lead')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddActivity = async () => {
    if (!activityDescription.trim()) {
      toast.error('Please enter a description')
      return
    }

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
      toast.success('Activity added')
    } catch (error) {
      console.error('Error adding activity:', error)
      toast.error('Failed to add activity')
    }
  }

  const handleQuickStatusChange = async (newStatus: string) => {
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
      toast.success('Status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSetFollowUp = async (days: number) => {
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
      toast.success(`Follow-up set for ${days} day${days !== 1 ? 's' : ''} from now`)
    } catch (error) {
      console.error('Error setting follow-up:', error)
      toast.error('Failed to set follow-up')
    }
  }

  const handleConvertToOrg = async () => {
    if (!confirm('Are you sure you want to convert this lead to an organisation? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/owner/leads/${leadId}/convert`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to convert lead')
      }
      const data = await res.json()
      toast.success('Lead converted to organisation successfully')
      window.location.href = `/owner/orgs`
    } catch (error: any) {
      console.error('Error converting lead:', error)
      toast.error(error.message || 'Failed to convert lead')
    }
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

  if (status === 'loading' || isLoading || !lead) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center w-full min-w-0">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>

        {/* Form Skeleton */}
        <CardSkeleton className="h-96" />
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start w-full min-w-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/owner/leads')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] break-words">
              {lead.orgName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={getStatusColor(lead.status)}>
                {lead.status}
              </Badge>
              {lead.convertedOrgId && (
                <Badge variant="outline" className="bg-green-100 text-green-700">
                  Converted
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  loadLead()
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Lead Information */}
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Madrasah Name</Label>
              {isEditing ? (
                <Input
                  value={formData.orgName}
                  onChange={(e) => {
                    const value = e.target.value
                    // Capitalize first letter of each word for organisation name
                    const capitalized = value.split(' ').map(word => {
                      if (word.length === 0) return word
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    }).join(' ')
                    setFormData({ ...formData, orgName: capitalized })
                  }}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm font-medium">{lead.orgName}</p>
              )}
            </div>
            <div>
              <Label>Status</Label>
              {isEditing ? (
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                    <SelectItem value="DEMO_BOOKED">Demo Booked</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1">
                  <Badge variant="outline" className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
              )}
            </div>
            <div>
              <Label>City</Label>
              {isEditing ? (
                <Input
                  value={formData.city}
                  onChange={(e) => {
                    const value = e.target.value
                    // Capitalize first letter of each word for city
                    const capitalized = value.split(' ').map(word => {
                      if (word.length === 0) return word
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    }).join(' ')
                    setFormData({ ...formData, city: capitalized })
                  }}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm">{lead.city || '-'}</p>
              )}
            </div>
            <div>
              <Label>Country</Label>
              {isEditing ? (
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm">{lead.country}</p>
              )}
            </div>
            <div>
              <Label>Estimated Students</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.estimatedStudents}
                  onChange={(e) => setFormData({ ...formData, estimatedStudents: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm">{lead.estimatedStudents || '-'}</p>
              )}
            </div>
            <div>
              <Label>Source</Label>
              {isEditing ? (
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="mt-1"
                  placeholder="e.g. cold call, referral"
                />
              ) : (
                <p className="mt-1 text-sm">{lead.source || '-'}</p>
              )}
            </div>
            <div>
              <Label>Contact Name</Label>
              {isEditing ? (
                <Input
                  value={formData.contactName}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.length > 0) {
                      setFormData({ ...formData, contactName: value.charAt(0).toUpperCase() + value.slice(1) })
                    } else {
                      setFormData({ ...formData, contactName: value })
                    }
                  }}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm">{lead.contactName || '-'}</p>
              )}
            </div>
            <div>
              <Label>Contact Email</Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm flex items-center gap-1">
                  {lead.contactEmail ? (
                    <>
                      <Mail className="h-3 w-3" />
                      {lead.contactEmail}
                    </>
                  ) : (
                    '-'
                  )}
                </p>
              )}
            </div>
            <div>
              <Label>Contact Phone</Label>
              {isEditing ? (
                <Input
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm flex items-center gap-1">
                  {lead.contactPhone ? (
                    <>
                      <Phone className="h-3 w-3" />
                      {lead.contactPhone}
                    </>
                  ) : (
                    '-'
                  )}
                </p>
              )}
            </div>
            <div>
              <Label>Next Follow-up</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.nextContactAt}
                  onChange={(e) => setFormData({ ...formData, nextContactAt: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm flex items-center gap-1">
                  {lead.nextContactAt ? (
                    <>
                      <Calendar className="h-3 w-3" />
                      {formatDate(lead.nextContactAt)}
                    </>
                  ) : (
                    '-'
                  )}
                </p>
              )}
            </div>
            <div>
              <Label>Last Contact</Label>
              <p className="mt-1 text-sm flex items-center gap-1">
                {lead.lastContactAt ? (
                  <>
                    <Clock className="h-3 w-3" />
                    {formatDate(lead.lastContactAt)}
                  </>
                ) : (
                  'Never'
                )}
              </p>
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              {isEditing ? (
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
              ) : (
                <p className="mt-1 text-sm whitespace-pre-wrap">{lead.notes || '-'}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {!isEditing && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <div>
                <Label className="mb-2 block">Quick Actions</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickStatusChange('CONTACTED')}
                  >
                    Mark Contacted
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickStatusChange('WON')}
                  >
                    Mark Won
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickStatusChange('LOST')}
                  >
                    Mark Lost
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetFollowUp(3)}
                  >
                    Follow-up in 3 days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetFollowUp(7)}
                  >
                    Follow-up in 1 week
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetFollowUp(30)}
                  >
                    Follow-up in 1 month
                  </Button>
                </div>
              </div>

              {/* Calendly Integration */}
              {calendlyUrl && (
                <div>
                  <Label className="mb-2 block">Book Demo</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = new URL(calendlyUrl)
                      if (lead.contactName) url.searchParams.set('name', lead.contactName)
                      if (lead.contactEmail) url.searchParams.set('email', lead.contactEmail)
                      window.open(url.toString(), '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Book Demo via Calendly
                  </Button>
                </div>
              )}

              {/* Convert to Organisation */}
              {!lead.convertedOrgId && (
                <div>
                  <Label className="mb-2 block">Conversion</Label>
                  <Button
                    size="sm"
                    onClick={handleConvertToOrg}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Convert to Organisation
                  </Button>
                </div>
              )}

              {lead.convertedOrgId && lead.ConvertedOrg && (
                <div>
                  <Label className="mb-2 block">Converted Organisation</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/owner/orgs`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View {lead.ConvertedOrg.name}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">Activity Timeline</CardTitle>
          <CardDescription className="text-xs sm:text-sm break-words">
            Track all interactions and updates for this lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Activity Form */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-4">
              <div>
                <Label>Activity Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="STATUS_CHANGE">Status Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                  placeholder="Enter activity description..."
                />
              </div>
              <Button onClick={handleAddActivity} size="sm">
                Add Activity
              </Button>
            </div>
          </div>

          {/* Activities List */}
          {lead.Activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activities yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {lead.Activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.type}
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
        </CardContent>
      </Card>
    </div>
  )
}

