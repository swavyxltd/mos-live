'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Page } from '@/components/shell/page'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDemoMode } from '@/lib/demo-mode'
import { format } from 'date-fns'
import { FileText, Download, CreditCard, Calendar, DollarSign } from 'lucide-react'

export default function ParentInvoicesPage() {
  const { data: session, status } = useSession()
  const [invoices, setInvoices] = useState<any[]>([])
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data for parent invoices
      const demoInvoices = [
        {
          id: 'demo-invoice-1',
          invoiceNumber: 'INV-2024-001',
          amount: 150.00,
          status: 'PAID',
          dueDate: new Date('2024-11-30'),
          paidDate: new Date('2024-11-25'),
          description: 'Monthly fees for Ahmed Hassan - Quran Recitation',
          student: {
            firstName: 'Ahmed',
            lastName: 'Hassan'
          },
          feesPlan: {
            name: 'Monthly Quran Classes'
          }
        },
        {
          id: 'demo-invoice-2',
          invoiceNumber: 'INV-2024-002',
          amount: 120.00,
          status: 'PAID',
          dueDate: new Date('2024-11-30'),
          paidDate: new Date('2024-11-28'),
          description: 'Monthly fees for Fatima Hassan - Islamic Studies',
          student: {
            firstName: 'Fatima',
            lastName: 'Hassan'
          },
          feesPlan: {
            name: 'Monthly Islamic Studies'
          }
        },
        {
          id: 'demo-invoice-3',
          invoiceNumber: 'INV-2024-003',
          amount: 150.00,
          status: 'PENDING',
          dueDate: new Date('2024-12-31'),
          description: 'Monthly fees for Ahmed Hassan - Quran Recitation',
          student: {
            firstName: 'Ahmed',
            lastName: 'Hassan'
          },
          feesPlan: {
            name: 'Monthly Quran Classes'
          }
        },
        {
          id: 'demo-invoice-4',
          invoiceNumber: 'INV-2024-004',
          amount: 120.00,
          status: 'PENDING',
          dueDate: new Date('2024-12-31'),
          description: 'Monthly fees for Fatima Hassan - Islamic Studies',
          student: {
            firstName: 'Fatima',
            lastName: 'Hassan'
          },
          feesPlan: {
            name: 'Monthly Islamic Studies'
          }
        }
      ]

      setInvoices(demoInvoices)
      setTotalOutstanding(demoInvoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0))
      setTotalPaid(demoInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0))
      setLoading(false)
    } else {
      // Fetch real invoices from API
      fetch('/api/invoices')
        .then(res => res.json())
        .then(data => {
          setInvoices(data)
          setTotalOutstanding(data.filter((inv: any) => inv.status === 'PENDING').reduce((sum: number, inv: any) => sum + inv.amount, 0))
          setTotalPaid(data.filter((inv: any) => inv.status === 'PAID').reduce((sum: number, inv: any) => sum + inv.amount, 0))
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching invoices:', err)
          setLoading(false)
        })
    }
  }, [status])

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to view invoices.</div>
  }

  // Demo org data
  const org = {
    id: 'demo-org-1',
    name: 'Leicester Islamic Centre',
    slug: 'leicester-islamic-centre'
  }

  const handlePayNow = async (invoiceId: string) => {
    // This would integrate with Stripe for payment processing
    console.log('Pay now for invoice:', invoiceId)
  }

  const handleDownloadPDF = async (invoiceId: string) => {
    // This would generate and download the invoice PDF
    console.log('Download PDF for invoice:', invoiceId)
  }

  return (
    <Page user={session.user} org={org} userRole="PARENT" title="Invoices" breadcrumbs={[{ href: '/parent/invoices', label: 'Invoices' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Invoices</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            View and manage your children's school fees and payments.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Outstanding</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">£{totalOutstanding.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Paid</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">£{totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Invoices</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{invoices.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Invoices List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">All Invoices</h3>
          <div className="space-y-4">
            {invoices.length > 0 ? (
              invoices.map(invoice => (
                <div key={invoice.id} className="border border-[var(--border)] rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-md font-medium text-[var(--foreground)]">
                          {invoice.invoiceNumber}
                        </h4>
                        <Badge
                          variant={
                            invoice.status === 'PAID' ? 'default' :
                            invoice.status === 'PENDING' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {invoice.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-[var(--muted-foreground)]">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due: {format(new Date(invoice.dueDate), 'PPP')}
                        </div>
                        {invoice.paidDate && (
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Paid: {format(new Date(invoice.paidDate), 'PPP')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[var(--foreground)]">
                          £{invoice.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {invoice.status === 'PENDING' && (
                          <Button
                            onClick={() => handlePayNow(invoice.id)}
                            className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
                          >
                            Pay Now
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadPDF(invoice.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)]">No invoices found.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Payment Information</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-[var(--foreground)] mb-2">Accepted Payment Methods</h4>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1">
                <li>• Credit/Debit Cards (Visa, Mastercard, American Express)</li>
                <li>• Bank Transfer</li>
                <li>• Cash (at the school office)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--foreground)] mb-2">Payment Terms</h4>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1">
                <li>• Invoices are due by the last day of each month</li>
                <li>• Late payments may incur a £5 administration fee</li>
                <li>• For payment plans or financial assistance, please contact the school office</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  )
}