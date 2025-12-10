'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Save,
  X as CloseIcon,
  Loader2,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
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
  source: string | null
  lastContactAt: string | null
  nextContactAt: string | null
  notes: string | null
  assignedToUserId: string | null
  convertedOrgId: string | null
}

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (leadData: any) => void
  leadId: string | null
}

export function EditLeadModal({ isOpen, onClose, onSave, leadId }: EditLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lead, setLead] = useState<Lead | null>(null)
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

  useEffect(() => {
    if (isOpen && leadId) {
      loadLead()
    }
  }, [isOpen, leadId])

  const loadLead = async () => {
    if (!leadId) return
    
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

  // Auto-capitalize function for names and titles
  const capitalizeWords = (str: string): string => {
    if (!str) return str
    return str
      .split(' ')
      .map(word => {
        if (!word) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
      .trim()
  }

  const handleInputChange = (field: string, value: string) => {
    // Auto-capitalize first letter for name fields as they type
    if (field === 'contactName' && value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1)
    }
    // Auto-lowercase for email as they type
    if (field === 'contactEmail') {
      value = value.toLowerCase()
    }
    // Capitalize first letter of each word for city
    if (field === 'city' && value.length > 0) {
      value = value.split(' ').map(word => {
        if (word.length === 0) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }).join(' ')
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBlur = (field: string, value: string) => {
    // Auto-capitalize for madrasah name and contact name on blur
    if (field === 'orgName' || field === 'contactName') {
      const capitalized = capitalizeWords(value)
      setFormData(prev => ({ ...prev, [field]: capitalized }))
    }
  }

  const handleSave = async () => {
    // Import validation functions
    const { isValidName, isValidEmailStrict, isValidPhone, isValidCity } = await import('@/lib/input-validation')
    
    if (!leadId || !formData.orgName.trim()) {
      setError('Madrasah name is required')
      return
    }
    
    if (!formData.city.trim()) {
      setError('City is required')
      return
    }
    
    if (!isValidCity(formData.city)) {
      setError('City must be a valid city name (2-50 characters, letters only)')
      return
    }

    // Validate contact name if provided
    if (formData.contactName && formData.contactName.trim()) {
      const nameParts = formData.contactName.trim().split(/\s+/)
      if (nameParts.length < 2) {
        setError('Contact name must include both first and last name')
        return
      }
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')
      if (!isValidName(firstName) || !isValidName(lastName)) {
        setError('Contact name must be a valid name (2-50 characters per name, letters only)')
        return
      }
    }

    // Validate contact email if provided
    if (formData.contactEmail && formData.contactEmail.trim() && !isValidEmailStrict(formData.contactEmail)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate contact phone if provided
    if (formData.contactPhone && formData.contactPhone.trim() && !isValidPhone(formData.contactPhone)) {
      setError('Please enter a valid UK phone number')
      return
    }

    setIsSubmitting(true)
    setError('')

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

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to update lead')
        setIsSubmitting(false)
        return
      }

      const data = await res.json()
      
      // Trigger refresh
      window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      
      toast.success('Lead updated successfully')
      onSave(data.lead)
      handleClose()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
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
    setError('')
    setIsSubmitting(false)
    setLead(null)
    onClose()
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

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Edit Lead">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Edit Lead"
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Current Status */}
        {lead && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <Badge variant="outline" className={getStatusColor(lead.status)}>
              {formatStatus(lead.status)}
            </Badge>
            {lead.convertedOrgId && (
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Converted
              </Badge>
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orgName">
                Madrasah Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="orgName"
                value={formData.orgName}
                onChange={(e) => handleInputChange('orgName', e.target.value)}
                onBlur={(e) => handleBlur('orgName', e.target.value)}
                placeholder="Enter madrasah name (e.g., Masjid Falah)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter city"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedStudents">Estimated Students</Label>
              <Input
                id="estimatedStudents"
                type="number"
                value={formData.estimatedStudents}
                onChange={(e) => handleInputChange('estimatedStudents', e.target.value)}
                placeholder="e.g., 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="e.g. cold call, referral"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => handleInputChange('contactName', e.target.value)}
                onBlur={(e) => handleBlur('contactName', e.target.value)}
                placeholder="Enter contact name (e.g., John Smith)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextContactAt">Next Follow-up Date</Label>
              <Input
                id="nextContactAt"
                type="date"
                value={formData.nextContactAt}
                onChange={(e) => handleInputChange('nextContactAt', e.target.value)}
              />
            </div>
          </div>
          {lead && lead.lastContactAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last Contact: {formatDate(lead.lastContactAt)}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes about this lead..."
              rows={4}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !formData.orgName.trim() || !formData.city.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

