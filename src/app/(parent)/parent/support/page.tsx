'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Page } from '@/components/shell/page'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isDemoMode } from '@/lib/demo-mode'
import { format } from 'date-fns'
import { MessageSquare, Mail, MapPin, Clock, Send, AlertCircle, CheckCircle } from 'lucide-react'

interface SupportTicketResponse {
  id: string
  ticketId: string
  body: string
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
}

export default function ParentSupportPage() {
  const { data: session, status } = useSession()
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data for support tickets
      setSupportTickets([
        {
          id: 'demo-ticket-1',
          subject: 'Question about Ahmed\'s progress',
          description: 'I would like to know more about Ahmed\'s progress in Quran recitation class.',
          status: 'OPEN',
          priority: 'MEDIUM',
          createdAt: new Date('2024-12-05'),
          updatedAt: new Date('2024-12-05'),
          category: 'ACADEMIC'
        },
        {
          id: 'demo-ticket-2',
          subject: 'Payment issue resolved',
          description: 'Had trouble with the online payment system, but it\'s now working.',
          status: 'CLOSED',
          priority: 'HIGH',
          createdAt: new Date('2024-11-28'),
          updatedAt: new Date('2024-11-30'),
          category: 'BILLING',
          responses: [
            {
              id: 'response-1',
              ticketId: 'demo-ticket-2',
              body: 'Thank you for reporting this issue. The payment system has been updated and should now work correctly. Please try again and let us know if you encounter any further issues.',
              createdAt: new Date('2024-11-30').toISOString(),
              createdBy: {
                id: 'owner-1',
                name: 'Support Team',
                email: 'support@madrasah.io'
              }
            }
          ]
        }
      ])
      setLoading(false)
    } else {
      // Fetch real support tickets from API
      fetch('/api/support/tickets')
        .then(res => res.json())
        .then(data => {
          setSupportTickets(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching support tickets:', err)
          setLoading(false)
        })
    }
  }, [status])

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to access support.</div>
  }

  // Demo org data
  const org = {
    id: 'demo-org-1',
    name: 'Leicester Islamic Centre',
    slug: 'leicester-islamic-centre'
  }

  const handleCreateTicket = async (formData: FormData) => {
    const subject = formData.get('subject') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const priority = formData.get('priority') as string

    if (!subject || !description) {
      alert('Subject and description are required')
      return
    }

    try {
      if (isDemoMode()) {
        // In demo mode, just log the ticket creation
        console.log('Demo ticket created:', { subject, description, category, priority })
        alert('Support ticket created successfully! (Demo mode)')
        return
      } else {
        // Create real ticket in database
        const response = await fetch('/api/support/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject,
            description,
            category,
            priority
          })
        })
        
        if (response.ok) {
          alert('Support ticket created successfully!')
        } else {
          alert('Failed to create support ticket')
        }
      }
    } catch (error) {
      console.error('Error creating support ticket:', error)
      alert('Failed to create support ticket')
    }
  }

  return (
    <Page user={session.user} org={org} userRole="PARENT" title="Support" breadcrumbs={[{ href: '/parent/support', label: 'Support' }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Support</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Get help with your children's education, payments, and school-related questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Address</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Leicester Islamic Centre<br />
                      123 High Street<br />
                      Leicester, LE1 1AA<br />
                      United Kingdom
                    </p>
                  </div>
                </div>


                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Email</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      info@leicesterislamiccentre.org<br />
                      <span className="text-xs">General inquiries</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Office Hours</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Monday - Friday: 9:00 AM - 5:00 PM<br />
                      Saturday: 10:00 AM - 2:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Technical Support</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">App Issues</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      For technical problems with the Madrasah OS app, please contact:
                    </p>
                    <p className="text-sm font-medium text-[var(--primary)] mt-1">
                      support@madrasah.io
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Support Tickets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create New Ticket */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Create Support Ticket</h3>
              <form action={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      id="category"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)]"
                      required
                    >
                      <option value="ACADEMIC">Academic</option>
                      <option value="BILLING">Billing & Payments</option>
                      <option value="ATTENDANCE">Attendance</option>
                      <option value="TECHNICAL">Technical Support</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      id="priority"
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)]"
                      required
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Subject
                  </label>
                  <Input
                    type="text"
                    name="subject"
                    id="subject"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={4}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--background)] text-[var(--foreground)]"
                    placeholder="Please provide detailed information about your issue..."
                    required
                  />
                </div>
                <Button type="submit" className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90">
                  <Send className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </form>
            </Card>

            {/* Existing Tickets */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Your Support Tickets</h3>
              <div className="space-y-4">
                {supportTickets.length > 0 ? (
                  supportTickets.map(ticket => (
                    <div key={ticket.id} className="border border-[var(--border)] rounded-[var(--radius-md)] p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-md font-medium text-[var(--foreground)]">
                              {ticket.subject}
                            </h4>
                            <Badge
                              variant={
                                ticket.status === 'OPEN' ? 'destructive' :
                                ticket.status === 'CLOSED' ? 'default' :
                                'secondary'
                              }
                            >
                              {ticket.status}
                            </Badge>
                            <Badge variant="outline">
                              {ticket.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)] mb-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-[var(--muted-foreground)]">
                            <span>Created: {format(new Date(ticket.createdAt), 'PPP')}</span>
                            <span>Updated: {format(new Date(ticket.updatedAt), 'PPP')}</span>
                            <span>Category: {ticket.category}</span>
                            {ticket.responses && ticket.responses.length > 0 && (
                              <span className="flex items-center">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                {ticket.responses.length} response(s)
                              </span>
                            )}
                          </div>
                          
                          {/* Display responses */}
                          {ticket.responses && ticket.responses.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {ticket.responses.map((response) => (
                                <div key={response.id} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-blue-800">
                                      {response.createdBy.name}
                                    </span>
                                    <span className="text-xs text-blue-600">
                                      {format(new Date(response.createdAt), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  <p className="text-sm text-blue-700">{response.body}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          {ticket.status === 'OPEN' ? (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                    <p className="text-[var(--muted-foreground)]">No support tickets found.</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      Create your first support ticket above.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  )
}