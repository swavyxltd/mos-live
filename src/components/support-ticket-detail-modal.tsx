'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Building2, 
  MessageSquare,
  Send,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react'

interface SupportTicketDetailModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
  onUpdate?: () => void
}

interface Ticket {
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
  org?: {
    id: string
    name: string
    slug: string
  }
  SupportTicketResponse?: Array<{
    id: string
    body: string
    createdAt: string
    User: {
      id: string
      name: string
      email: string
    }
  }>
  responses?: Array<{
    id: string
    body: string
    createdAt: string
    createdBy: {
      id: string
      name: string
      email: string
    }
  }>
}

export function SupportTicketDetailModal({
  isOpen,
  onClose,
  ticketId,
  onUpdate
}: SupportTicketDetailModalProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [responding, setResponding] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [responseBody, setResponseBody] = useState('')
  const [newStatus, setNewStatus] = useState<string>('')

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicket()
    } else {
      setTicket(null)
      setResponseBody('')
      setNewStatus('')
    }
  }, [isOpen, ticketId])

  const fetchTicket = async () => {
    if (!ticketId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/owner/support/tickets/${ticketId}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Ticket data:', data)
        setTicket(data)
        setNewStatus(data.status)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching ticket:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          ticketId
        })
        toast.error(errorData.error || `Failed to fetch ticket (${response.status})`)
      }
    } catch (error: any) {
      console.error('Error fetching ticket:', {
        error,
        message: error?.message,
        ticketId
      })
      toast.error(error?.message || 'Failed to fetch ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async () => {
    if (!ticketId || !responseBody.trim()) {
      toast.error('Please enter a response')
      return
    }

    try {
      setResponding(true)
      const response = await fetch(`/api/owner/support/tickets/${ticketId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responseBody }),
      })

      if (response.ok) {
        toast.success('Response sent successfully')
        setResponseBody('')
        fetchTicket()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send response')
      }
    } catch (error) {
      toast.error('Failed to send response')
    } finally {
      setResponding(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!ticketId || !newStatus || newStatus === ticket?.status) {
      return
    }

    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/owner/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success('Ticket status updated')
        fetchTicket()
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="text-red-600 border-red-600">Open</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">In Progress</Badge>
      case 'RESOLVED':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Resolved</Badge>
      case 'CLOSED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Support Ticket Details"
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : !ticket ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          Ticket not found
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ticket Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">{ticket.subject}</h3>
                  {getStatusBadge(ticket.status)}
                </div>
                <div className="flex items-center space-x-2 text-sm text-[var(--muted-foreground)] mb-4">
                  <Badge variant="outline" className="font-mono">{ticket.ticketNumber}</Badge>
                  <span>•</span>
                  <span>{getStatusIcon(ticket.status)}</span>
                </div>
              </div>
            </div>

            {/* Ticket Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--muted)] rounded-lg">
              <div className="flex items-start space-x-2">
                <User className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Created By</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {ticket.User?.name || ticket.createdBy?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Mail className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Email</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {ticket.User?.email || ticket.createdBy?.email || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Building2 className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Organisation</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {ticket.Org?.name || ticket.org?.name || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Calendar className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5" />
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Created</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-xs text-[var(--muted-foreground)]">Role:</span>
                <Badge variant="outline">{ticket.role}</Badge>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-4 bg-[var(--muted)] rounded-lg">
              <Label className="mb-2">Message</Label>
              <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{ticket.body}</p>
            </div>
          </div>

          {/* Status Update */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              {newStatus !== ticket.status && (
                <Button
                  size="sm"
                  onClick={handleStatusUpdate}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Update Status
                </Button>
              )}
            </div>
          </div>

          {/* Responses */}
          {(ticket.SupportTicketResponse || ticket.responses) && (ticket.SupportTicketResponse || ticket.responses)!.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-[var(--foreground)] mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Responses ({(ticket.SupportTicketResponse || ticket.responses)!.length})
              </h4>
              <div className="space-y-3">
                {(ticket.SupportTicketResponse || ticket.responses)!.map((response: any) => (
                  <div key={response.id} className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-blue-800">
                          {response.User?.name || response.createdBy?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-blue-600">
                          {format(new Date(response.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 whitespace-pre-wrap">{response.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Form */}
          {ticket.status === 'CLOSED' ? (
            <div className="border-t pt-4">
              <div className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                <div className="flex items-center space-x-2 text-[var(--muted-foreground)]">
                  <XCircle className="h-4 w-4" />
                  <p className="text-sm">This ticket is closed. No further responses can be added.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4">
              <Label htmlFor="response" className="mb-2 block">Add Response</Label>
              <Textarea
                id="response"
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                placeholder="Type your response here..."
                rows={4}
                className="mb-3"
              />
              <Button
                onClick={handleRespond}
                disabled={!responseBody.trim() || responding}
                className="w-full"
              >
                {responding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Response
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

