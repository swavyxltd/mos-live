/**
 * Shared utility functions for transforming invoice/payment data
 * Ensures consistency between parent and staff/admin views
 */

import { Invoice, Payment, Student, User } from '@prisma/client'

interface InvoiceWithRelations extends Invoice {
  student: Student & {
    primaryParent?: User | null
  }
  payments?: Payment[]
}

export interface TransformedInvoice {
  id: string
  invoiceNumber: string
  studentName: string
  parentName: string
  parentEmail: string
  amount: number
  currency: string
  status: string
  dueDate: Date | string
  paidDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  payments: Array<{
    id: string
    method: string
    amount: number
    status: string
    createdAt: Date | string
    meta?: any
  }>
  student?: {
    id: string
    hasStripeAutoPayment?: boolean
  }
}

/**
 * Transform invoice data consistently for both parent and staff views
 */
export function transformInvoiceData(
  invoice: InvoiceWithRelations,
  hasStripeAutoPayment: boolean = false
): TransformedInvoice {
  return {
    id: invoice.id,
    invoiceNumber: `INV-${invoice.id.slice(-8).toUpperCase()}`,
    studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
    parentName: invoice.student.primaryParent?.name || 'N/A',
    parentEmail: invoice.student.primaryParent?.email || 'N/A',
    amount: invoice.amountP / 100, // Convert from pence to pounds
    currency: 'GBP',
    status: invoice.status,
    dueDate: invoice.dueDate,
    paidDate: invoice.paidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    payments: (invoice.payments || []).map(payment => ({
      id: payment.id,
      method: payment.method,
      amount: payment.amountP / 100, // Convert from pence to pounds
      status: payment.status,
      createdAt: payment.createdAt,
      meta: (payment as any).meta
    })),
    student: {
      id: invoice.student.id,
      hasStripeAutoPayment
    }
  }
}

