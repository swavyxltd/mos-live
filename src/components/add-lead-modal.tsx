'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target,
  Save,
  X as CloseIcon,
  Loader2,
  Building2,
  MapPin,
  Users,
  Mail,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (leadData: any) => void
}

export function AddLeadModal({ isOpen, onClose, onSave }: AddLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
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
    // Auto-lowercase for email as they type
    if (field === 'contactEmail') {
      value = value.toLowerCase()
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
    if (!formData.orgName.trim()) {
      setError('Madrasah name is required')
      return
    }
    if (!formData.city.trim()) {
      setError('City is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/owner/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedStudents: formData.estimatedStudents ? parseInt(formData.estimatedStudents) : null,
          nextContactAt: formData.nextContactAt || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create lead'
        const errorDetails = errorData.details ? ` (${errorData.details.message || JSON.stringify(errorData.details)})` : ''
        setError(errorMessage + errorDetails)
        console.error('Lead creation error:', errorData)
        setIsSubmitting(false)
        return
      }

      const data = await response.json()
      
      // Trigger refresh
      window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
      
      toast.success('Lead created successfully')
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
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Add New Lead"
    >
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
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
              <Label htmlFor="status">Initial Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                  <SelectItem value="DEMO_BOOKED">Demo Booked</SelectItem>
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
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Lead
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

