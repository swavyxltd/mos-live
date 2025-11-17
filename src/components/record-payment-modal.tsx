'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, CreditCard } from 'lucide-react'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string
  invoiceAmount: number
  onRecordPayment: (data: { amount: number; method: string; notes?: string }) => void
}

export function RecordPaymentModal({ 
  isOpen, 
  onClose, 
  invoiceId, 
  invoiceAmount,
  onRecordPayment 
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState(invoiceAmount.toString())
  const [method, setMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const paymentAmount = parseFloat(amount)
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        alert('Please enter a valid amount')
        return
      }

      if (!method) {
        alert('Please select a payment method')
        return
      }

      await onRecordPayment({
        amount: paymentAmount,
        method,
        notes: notes.trim() || undefined
      })

      // Reset form
      setAmount(invoiceAmount.toString())
      setMethod('')
      setNotes('')
      onClose()
    } catch (error) {
      alert('Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setAmount(invoiceAmount.toString())
    setMethod('')
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount (£)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter payment amount"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Invoice total: £{invoiceAmount.toFixed(2)}
            </p>
          </div>

          <div>
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="DIRECT_DEBIT">Direct Debit</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              These payments will be checked manually
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
