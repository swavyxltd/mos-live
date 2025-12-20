'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Clock, AlertCircle, Plus, MessageSquare, Search, Filter } from 'lucide-react'
import { PhoneLink } from '@/components/phone-link'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OrgContactInfo {
  name: string
  address: string
  phone: string
  email: string
  officeHours: string
}

interface SupportTicket {
  id: string
  ticketNumber: string
  subject: string
  body: string
  status: string
  role: string
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  responses?: SupportTicketResponse[]
}

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
  const [contactInfo, setContactInfo] = useState<OrgContactInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [showCreateTicket, setShowCreateTicket] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [newTicket, setNewTicket] = useState({
    subject: '',
    body: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    // Always fetch real contact information from organisation settings
    fetch('/api/org/contact-info')
      .then(res => res.json())
      .then(data => {
        setContactInfo(data)
        setLoading(false)
      })
      .catch(err => {
        setLoading(false)
      })

    // Fetch support tickets
    fetchTickets()
  }, [status])

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true)
      const response = await fetch('/api/support/tickets?role=PARENT')
      if (response.ok) {
        const data = await response.json()
        const transformed: SupportTicket[] = data.map((ticket: any) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber || ticket.id.substring(0, 8).toUpperCase(),
          subject: ticket.subject,
          body: ticket.body,
          status: ticket.status,
          role: ticket.role || 'PARENT',
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          createdBy: ticket.createdBy || ticket.User || {
            id: '',
            name: 'Unknown',
            email: ''
          },
          responses: ticket.responses || []
        }))
        setTickets(transformed)
      } else {
        setTickets([])
      }
    } catch (error) {
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicket.subject || !newTicket.body) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTicket,
          role: 'PARENT'
        }),
      })

      if (response.ok) {
        const ticket = await response.json()
        toast.success(`Ticket ${ticket.ticketNumber || ticket.id} created successfully`)
        setNewTicket({ subject: '', body: '' })
        setShowCreateTicket(false)
        fetchTickets()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create support ticket')
      }
    } catch (error) {
      toast.error('Failed to create support ticket')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      case 'RESOLVED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!session?.user?.id) {
    return null // Will be handled by auth redirect
  }

  if (loading) {
    return null // Will be handled by loading.tsx
  }

  if (!contactInfo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Support</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Get help with your children's education, payments, and school-related questions.
          </p>
        </div>
        <Card className="p-6">
          <div className="text-center text-[var(--muted-foreground)]">
            Contact information is being set up. Please check back soon.
          </div>
        </Card>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Support</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Get help with your children's education, payments, and school-related questions.
        </p>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <Card className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Contact Information</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Get in touch with us for any questions or support</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Address */}
            <div className="text-center">
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Visit Us</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                {contactInfo.address.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="text-center">
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Call Us</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                <p className="font-medium text-[var(--primary)]">
                  <PhoneLink phone={contactInfo.phone} />
                </p>
                <p className="text-sm">General inquiries</p>
              </div>
            </div>

            {/* Office Hours */}
            <div className="text-center">
              <div className="bg-orange-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Office Hours</h4>
              <div className="text-sm text-[var(--muted-foreground)] space-y-1">
                {contactInfo.officeHours.split('\n').map((line, index) => (
                  <p key={index} className={line.toLowerCase().includes('closed') ? 'text-red-600' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Technical Support */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Technical Support</h3>
          <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">App Issues</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      For technical problems with the Madrasah OS app, please create a support ticket below or contact:
                    </p>
                    <a 
                      href="mailto:support@madrasah.io?subject=Madrasah OS App Support Request"
                      className="text-sm font-medium text-[var(--primary)] mt-1 hover:underline"
                    >
                      support@madrasah.io
                    </a>
                  </div>
                </div>
          </div>
        </Card>

        {/* Support Tickets Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Your Support Tickets</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Track and manage your support requests</p>
            </div>
            <Button 
              onClick={() => setShowCreateTicket(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>

          {tickets.length > 0 && (
            <div className="mb-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            {loadingTickets ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No tickets found</h3>
                <p className="text-[var(--muted-foreground)] mb-4">Create your first support ticket to get started</p>
                <Button onClick={() => setShowCreateTicket(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-[var(--foreground)]">{ticket.subject}</h4>
                        <Badge variant="outline" className="text-xs font-mono">{ticket.ticketNumber}</Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">{ticket.body}</p>
                      <div className="flex items-center space-x-4 text-sm text-[var(--muted-foreground)]">
                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                        {ticket.responses && ticket.responses.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {ticket.responses.length} response(s)
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Display responses */}
                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {ticket.responses.map((response) => (
                            <div key={response.id} className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-blue-800">
                                  Support Team
                                </span>
                                <span className="text-sm text-blue-600">
                                  {format(new Date(response.createdAt), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <p className="text-sm text-blue-700">{response.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Create Ticket Modal */}
      <Modal 
        isOpen={showCreateTicket} 
        onClose={() => setShowCreateTicket(false)} 
        title="Create Support Ticket"
      >
        <form onSubmit={handleCreateTicket} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              placeholder="Brief description of your issue"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newTicket.body}
              onChange={(e) => setNewTicket({ ...newTicket, body: e.target.value })}
              placeholder="Provide detailed information about your issue..."
              rows={6}
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateTicket(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}