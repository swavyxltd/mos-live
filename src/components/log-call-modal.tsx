'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  X as CloseIcon,
  Loader2,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'

interface LogCallModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  leadId: string
  leadPhone?: string | null
}

const CALL_OUTCOMES = [
  'No answer',
  'Busy / Couldn\'t talk',
  'Spoke – interested',
  'Spoke – not interested',
  'Asked to call back later',
  'Wrong number',
]

export function LogCallModal({ 
  isOpen, 
  onClose, 
  onSaved, 
  leadId,
  leadPhone 
}: LogCallModalProps) {
  const [outcome, setOutcome] = useState<string>('')
  const [callDateTime, setCallDateTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [followUpDate, setFollowUpDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Set default date/time to now
      const now = new Date()
      const dateTimeString = now.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
      setCallDateTime(dateTimeString)
      
      // Set default follow-up date to 7 days from now
      const followUpDate = new Date(now)
      followUpDate.setDate(followUpDate.getDate() + 7)
      setFollowUpDate(followUpDate.toISOString().split('T')[0])
      
      // Reset form
      setOutcome('')
      setNotes('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!outcome) {
      toast.error('Please select a call outcome')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/owner/leads/${leadId}/log-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          callDateTime: callDateTime ? new Date(callDateTime).toISOString() : new Date().toISOString(),
          notes: notes.trim() || null,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to log call')
      }

      toast.success('Call logged successfully')
      onSaved()
      handleClose()
    } catch (error: any) {
      console.error('Error logging call:', error)
      toast.error(error.message || 'Failed to log call')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setOutcome('')
    setCallDateTime('')
    setNotes('')
    setFollowUpDate('')
    setIsSubmitting(false)
    onClose()
  }

  const showFollowUpDate = outcome === 'Asked to call back later'

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Log Call Attempt"
    >
      <div className="space-y-6">
        {leadPhone && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Phone:</span> {leadPhone}
            </div>
          </div>
        )}

        {/* Call Outcome */}
        <div className="space-y-2">
          <Label htmlFor="outcome">
            Call Outcome <span className="text-red-500">*</span>
          </Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger id="outcome">
              <SelectValue placeholder="Select outcome" />
            </SelectTrigger>
            <SelectContent>
              {CALL_OUTCOMES.map((outcomeOption) => (
                <SelectItem key={outcomeOption} value={outcomeOption}>
                  {outcomeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Call Date/Time */}
        <div className="space-y-2">
          <Label htmlFor="callDateTime">
            Date & Time <span className="text-red-500">*</span>
          </Label>
          <Input
            id="callDateTime"
            type="datetime-local"
            value={callDateTime}
            onChange={(e) => setCallDateTime(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Follow-up Date (only show if "Asked to call back later") */}
        {showFollowUpDate && (
          <div className="space-y-2">
            <Label htmlFor="followUpDate">
              Follow-up Date
            </Label>
            <Input
              id="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about the call..."
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !outcome || !callDateTime}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

