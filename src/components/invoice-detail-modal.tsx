'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { X, CreditCard, Calendar, User, Mail } from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  parentName: string
  parentEmail: string
  amount: number
  currency: string
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE'
  dueDate: string
  paidDate?: string
  createdAt: string
  updatedAt: string
  payments?: Array<{
    id: string
    method: string
    amount: number
    status: string
    createdAt: string
  }>
}

interface InvoiceDetailModalProps {
  invoice: Invoice | null
  isOpen: boolean
  onClose: () => void
  onRecordPayment?: (invoiceId: string) => void
}

export function InvoiceDetailModal({ 
  invoice, 
  isOpen, 
  onClose, 
  onRecordPayment 
}: InvoiceDetailModalProps) {
  if (!invoice) return null

  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      DRAFT: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Created {format(new Date(invoice.createdAt), 'PPP')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(invoice.status)}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Details */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Invoice Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Amount:</span>
                <span className="font-semibold">£{invoice.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date:</span>
                <span>{format(new Date(invoice.dueDate), 'PPP')}</span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid Date:</span>
                  <span>{format(new Date(invoice.paidDate), 'PPP')}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Student & Parent Info */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Student & Parent</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{invoice.studentName}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-900">{invoice.parentName}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-500">{invoice.parentEmail}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card className="p-4 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="text-sm font-medium">{payment.method}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">£{payment.amount.toFixed(2)}</span>
                    <Badge 
                      variant={payment.status === 'SUCCEEDED' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          {invoice.status !== 'PAID' && onRecordPayment && (
            <Button
              onClick={() => onRecordPayment(invoice.id)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
