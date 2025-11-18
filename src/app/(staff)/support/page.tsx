'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Plus, Search, BookOpen, Video, HelpCircle, MessageSquare, Mail, Filter, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { PageSkeleton } from '@/components/loading/skeleton'

interface SupportTicket {
  id: string
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

export default function SupportPage() {
  const { data: session, status } = useSession()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateTicket, setShowCreateTicket] = useState(false)
  const [newTicket, setNewTicket] = useState({
    subject: '',
    body: '',
    role: 'STAFF'
  })

  useEffect(() => {
    if (status === 'loading') return
    fetchTickets()
  }, [status])

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/support/tickets')
      if (response.ok) {
        const data = await response.json()
        // Transform API data to match SupportTicket interface
        const transformed: SupportTicket[] = data.map((ticket: any) => ({
          id: ticket.id,
          subject: ticket.subject,
          body: ticket.body,
          status: ticket.status,
          role: ticket.role || 'STAFF',
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          createdBy: ticket.User || {
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
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicket.subject || !newTicket.body) return

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicket),
      })

      if (response.ok) {
        const ticket = await response.json()
        setTickets([ticket, ...tickets])
        setNewTicket({ subject: '', body: '', role: 'STAFF' })
        setShowCreateTicket(false)
      } else {
        alert('Failed to create support ticket')
      }
    } catch (error) {
      alert('Failed to create support ticket')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-black rounded-lg p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Center</h1>
            <p className="text-gray-300 text-lg">
              Get help and support for your organization. We're here to assist you.
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateTicket(true)}
            className="bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/support/docs">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <div className="flex items-center space-x-4 h-full">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors flex-shrink-0">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)]">Documentation</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Guides & tutorials</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/support/faq">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
            <div className="flex items-center space-x-4 h-full">
              <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors flex-shrink-0">
                <HelpCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)]">FAQ</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Common questions</p>
              </div>
            </div>
          </Card>
        </Link>

        <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
          <div className="flex items-center space-x-4 h-full">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors flex-shrink-0">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--foreground)]">Video Tutorials</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Step-by-step guides</p>
            </div>
          </div>
        </Card>

      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Support Tickets Section */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Your Support Tickets</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage and track your support requests</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-48"
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
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredTickets.length === 0 ? (
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
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">{ticket.body}</p>
                        <div className="flex items-center space-x-4 text-xs text-[var(--muted-foreground)]">
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            By {ticket.createdBy?.name}
                          </span>
                          <span>•</span>
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
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Contact & Help Section */}
        <div className="space-y-6">
          {/* Contact Support */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Contact Support</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 bg-[var(--muted)] rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-[var(--foreground)]">Email Support</h4>
                  <p className="text-sm text-[var(--muted-foreground)]">support@madrasah.io</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Response time: 24 hours</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Support Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Open Tickets</span>
                <span className="font-semibold text-green-600">
                  {tickets.filter(t => t.status === 'OPEN').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">In Progress</span>
                <span className="font-semibold text-yellow-600">
                  {tickets.filter(t => t.status === 'IN_PROGRESS').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Resolved</span>
                <span className="font-semibold text-[var(--muted-foreground)]">
                  {tickets.filter(t => t.status === 'CLOSED').length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal 
        isOpen={showCreateTicket} 
        onClose={() => setShowCreateTicket(false)} 
        title="Create Support Ticket"
        className="max-w-2xl"
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
