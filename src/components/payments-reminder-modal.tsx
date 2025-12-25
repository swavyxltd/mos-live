'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertCircle, Send, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface PaymentsReminderModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  overdueCount: number
}

export function PaymentsReminderModal({ isOpen, onClose, onConfirm, overdueCount }: PaymentsReminderModalProps) {
  const [sending, setSending] = useState(false)

  const handleConfirm = async () => {
    setSending(true)
    try {
      await onConfirm()
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Payment Reminders"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Send reminders to {overdueCount} overdue payment{overdueCount !== 1 ? 's' : ''}?
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              This will send email reminders to all families with overdue payments.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={sending}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

