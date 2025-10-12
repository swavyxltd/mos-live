'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Mail, 
  Filter, 
  MoreHorizontal,
  Reply,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Building2
} from 'lucide-react'
import { format } from 'date-fns'
import { isDemoMode } from '@/lib/demo-mode'

interface SupportTicket {
  id: string
  subject: string
  body: string
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  role: 'STAFF' | 'PARENT' | 'ADMIN'
  createdAt: string
  updatedAt: string
  orgId: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  org?: {
    id: string
    name: string
    slug: string
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

export default function OwnerSupportPage() {
  const { data: session, status } = useSession()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data for all organization support tickets
      const demoTickets: SupportTicket[] = [
        {
          id: 'ticket-1',
          subject: 'How to export student attendance data?',
          body: 'I need to export attendance data for the last month to share with parents. Can you help me with the steps?',
          status: 'OPEN',
          role: 'STAFF',
          createdAt: new Date('2024-12-05').toISOString(),
          updatedAt: new Date('2024-12-05').toISOString(),
          orgId: 'org-1',
          createdBy: {
            id: 'user-1',
            name: 'Ahmad Hassan',
            email: 'ahmad@madrasah.com'
          },
          org: {
            id: 'org-1',
            name: 'Leicester Islamic Centre',
            slug: 'leicester-islamic-centre'
          },
          responses: []
        },
        {
          id: 'ticket-2',
          subject: 'Payment processing issue',
          body: 'Parents are reporting that they cannot complete online payments. The payment page shows an error.',
          status: 'IN_PROGRESS',
          role: 'ADMIN',
          createdAt: new Date('2024-12-04').toISOString(),
          updatedAt: new Date('2024-12-05').toISOString(),
          orgId: 'org-1',
          createdBy: {
            id: 'user-2',
            name: 'Fatima Ali',
            email: 'fatima@madrasah.com'
          },
          org: {
            id: 'org-1',
            name: 'Leicester Islamic Centre',
            slug: 'leicester-islamic-centre'
          },
          responses: [
            {
              id: 'response-1',
              ticketId: 'ticket-2',
              body: 'Thank you for reporting this issue. I\'ve identified the problem and it should be resolved within 24 hours.',
              createdAt: new Date('2024-12-05').toISOString(),
              createdBy: {
                id: 'owner-1',
                name: 'Support Team',
                email: 'support@madrasah.io'
              }
            }
          ]
        },
        {
          id: 'ticket-3',
          subject: 'Question about Ahmed\'s progress',
          body: 'I would like to know more about Ahmed\'s progress in Quran recitation class.',
          status: 'CLOSED',
          role: 'PARENT',
          createdAt: new Date('2024-12-03').toISOString(),
          updatedAt: new Date('2024-12-04').toISOString(),
          orgId: 'org-1',
          createdBy: {
            id: 'user-3',
            name: 'Sarah Ahmed',
            email: 'sarah.ahmed@email.com'
          },
          org: {
            id: 'org-1',
            name: 'Leicester Islamic Centre',
            slug: 'leicester-islamic-centre'
          },
          responses: [
            {
              id: 'response-2',
              ticketId: 'ticket-3',
              body: 'Ahmed is making excellent progress in Quran recitation. His teacher has provided detailed feedback which you can view in the parent portal.',
              createdAt: new Date('2024-12-04').toISOString(),
              createdBy: {
                id: 'owner-1',
                name: 'Support Team',
                email: 'support@madrasah.io'
              }
            }
          ]
        },
        {
          id: 'ticket-4',
          subject: 'WhatsApp integration setup',
          body: 'I need help setting up WhatsApp messaging for our madrasah. The integration seems to be failing.',
          status: 'OPEN',
          role: 'ADMIN',
          createdAt: new Date('2024-12-01').toISOString(),
          updatedAt: new Date('2024-12-01').toISOString(),
          orgId: 'org-2',
          createdBy: {
            id: 'user-4',
            name: 'Omar Khan',
            email: 'omar@birmingham-madrasah.com'
          },
          org: {
            id: 'org-2',
            name: 'Birmingham Islamic Centre',
            slug: 'birmingham-islamic-centre'
          },
          responses: []
        }
      ]
      setTickets(demoTickets)
      setLoading(false)
    } else {
      // Fetch real support tickets from API
      fetch('/api/owner/support/tickets')
        .then(res => res.json())
        .then(data => {
          setTickets(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching support tickets:', err)
          setLoading(false)
        })
    }
  }, [status])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'CLOSED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="h-4 w-4" />
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800'
      case 'STAFF': return 'bg-blue-100 text-blue-800'
      case 'PARENT': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.createdBy?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesOrg = orgFilter === 'all' || ticket.orgId === orgFilter
    
    return matchesSearch && matchesStatus && matchesOrg
  })

  const handleRespondToTicket = async () => {
    if (!selectedTicket || !responseText.trim()) return

    setResponding(true)
    try {
      if (isDemoMode()) {
        // In demo mode, just add the response locally
        const newResponse: SupportTicketResponse = {
          id: `response-${Date.now()}`,
          ticketId: selectedTicket.id,
          body: responseText,
          createdAt: new Date().toISOString(),
          createdBy: {
            id: session?.user?.id || 'owner-1',
            name: session?.user?.name || 'Support Team',
            email: session?.user?.email || 'support@madrasah.io'
          }
        }

        setTickets(prev => prev.map(ticket => 
          ticket.id === selectedTicket.id 
            ? { ...ticket, responses: [...(ticket.responses || []), newResponse], updatedAt: new Date().toISOString() }
            : ticket
        ))

        setResponseText('')
        setShowResponseModal(false)
        setSelectedTicket(null)
        
        // Simulate email notification
        console.log(`Email notification sent to ${selectedTicket.createdBy?.email} about ticket response`)
      } else {
        // Real API call
        const response = await fetch(`/api/owner/support/tickets/${selectedTicket.id}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: responseText })
        })

        if (response.ok) {
          // Refresh tickets
          const updatedTickets = await fetch('/api/owner/support/tickets').then(res => res.json())
          setTickets(updatedTickets)
          setResponseText('')
          setShowResponseModal(false)
          setSelectedTicket(null)
        }
      }
    } catch (error) {
      console.error('Error responding to ticket:', error)
    } finally {
      setResponding(false)
    }
  }

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      if (isDemoMode()) {
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status: newStatus as any, updatedAt: new Date().toISOString() }
            : ticket
        ))
        console.log(`Ticket ${ticketId} status updated to ${newStatus}`)
      } else {
        const response = await fetch(`/api/owner/support/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })

        if (response.ok) {
          const updatedTickets = await fetch('/api/owner/support/tickets').then(res => res.json())
          setTickets(updatedTickets)
        }
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const uniqueOrgs = Array.from(new Set(tickets.map(t => t.orgId))).map(orgId => 
    tickets.find(t => t.orgId === orgId)?.org
  ).filter(Boolean)

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-black rounded-lg p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Center</h1>
            <p className="text-gray-300 text-lg">
              Manage support tickets from all your organizations.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'OPEN').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'CLOSED').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Organizations</p>
              <p className="text-2xl font-bold text-gray-900">
                {uniqueOrgs.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Organization Filter */}
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {uniqueOrgs.map((org) => (
                <SelectItem key={org?.id} value={org?.id || ''}>
                  {org?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusIcon(ticket.status)}
                    <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                  </Badge>
                  <Badge className={getRoleColor(ticket.role)}>
                    {ticket.role}
                  </Badge>
                </div>
                
                <p className="text-gray-600 mb-3">{ticket.body}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{ticket.createdBy?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Building2 className="h-4 w-4" />
                    <span>{ticket.org?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{ticket.createdBy?.email}</span>
                  </div>
                  <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                  {ticket.responses && ticket.responses.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket.responses.length} response(s)</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTicket(ticket)
                    setShowResponseModal(true)
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Respond
                </Button>
                
                <Select
                  value={ticket.status}
                  onValueChange={(value) => handleUpdateTicketStatus(ticket.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Respond to Ticket</h3>
              <p className="text-sm text-gray-600 mt-1">
                Replying to: <strong>{selectedTicket.subject}</strong>
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response
                </label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response here..."
                  rows={6}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponseModal(false)
                    setSelectedTicket(null)
                    setResponseText('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespondToTicket}
                  disabled={!responseText.trim() || responding}
                >
                  {responding ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
