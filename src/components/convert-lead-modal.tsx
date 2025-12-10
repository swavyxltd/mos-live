'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Building2,
  Loader2,
  X as CloseIcon,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'

interface ConvertLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (orgId: string) => void
  leadId: string | null
  leadName: string
  defaultEmail?: string | null
}

export function ConvertLeadModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  leadId,
  leadName,
  defaultEmail
}: ConvertLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [adminEmail, setAdminEmail] = useState(defaultEmail || '')

  const handleConvert = async () => {
    if (!leadId) {
      setError('Lead ID is missing')
      return
    }

    if (!adminEmail.trim()) {
      setError('Admin email is required')
      return
    }

    // Validate email
    const { isValidEmailStrict } = await import('@/lib/input-validation')
    if (!isValidEmailStrict(adminEmail.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/owner/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminEmail.trim(),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to convert lead')
      }

      const data = await res.json()
      toast.success('Lead converted to organisation successfully. Onboarding email sent!')
      onSuccess(data.org.id)
      handleClose()
    } catch (error: any) {
      console.error('Error converting lead:', error)
      setError(error.message || 'Failed to convert lead')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setAdminEmail(defaultEmail || '')
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Convert Lead to Organisation"
    >
      <div className="space-y-6">
        {/* Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Converting: {leadName}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                This will create a new organisation and send an onboarding email to the admin. The lead will be marked as "Won".
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Admin Email Input */}
        <div className="space-y-2">
          <Label htmlFor="adminEmail">
            Admin Email <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value)
                setError('')
              }}
              placeholder="admin@madrasah.org.uk"
              className="pl-10"
              required
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The admin will receive an onboarding email to set up the organisation. This person will become the initial admin.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={isSubmitting || !adminEmail.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Convert & Send Onboarding Email
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

