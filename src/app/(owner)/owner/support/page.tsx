'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SupportTicketDetailModal } from '@/components/support-ticket-detail-modal'
import { 
  HeadphonesIcon, 
  MessageSquare,
  Search,
  Filter,
  Plus,
  Eye,
  Reply,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  Priority,
  Activity,
  TrendingUp,
  Users
} from 'lucide-react'
import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/loading/skeleton'

export default function OwnerSupportPage() {
  const { data: session, status } = useSession()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (status === 'loading') return
    fetchTickets()
  }, [status])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const ticketsRes = await fetch('/api/owner/support/tickets', {
        cache: 'no-store'
      })
      
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        setTickets(ticketsData)
      } else {
        const errorData = await ticketsRes.json().catch(() => ({}))
        console.error('Error fetching tickets:', errorData)
        setTickets([]) // Set empty array on error to prevent infinite loading
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setTickets([]) // Set empty array on error to prevent infinite loading
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Calculate support data from tickets
  const supportData: any = {
    stats: {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t: any) => t.status === 'OPEN').length,
      resolvedTickets: tickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      pendingTickets: tickets.filter((t: any) => t.status === 'IN_PROGRESS').length,
      averageResponseTime: 0,
      customerSatisfaction: 0
    },
    recentTickets: tickets.slice(0, 10).map((ticket: any) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber || ticket.id.substring(0, 8).toUpperCase(),
      title: ticket.subject,
      description: ticket.body,
      status: ticket.status.toLowerCase(),
      priority: 'medium',
      category: 'general',
      customer: {
        name: ticket.User?.name || ticket.createdBy?.name || 'Unknown',
        email: ticket.User?.email || ticket.createdBy?.email || '',
        orgName: ticket.Org?.name || ticket.org?.name || 'Unknown Org'
      },
      assignedTo: 'Unassigned',
      createdAt: ticket.createdAt,
      lastActivity: ticket.updatedAt,
      responseTime: ticket.responses && ticket.responses.length > 0 
        ? `${Math.floor((new Date(ticket.responses[0].createdAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60))} hours`
        : 'No response yet'
    })),
    teamPerformance: [],
    commonIssues: [],
    satisfactionTrends: []
  }

  // Calculate average response time
  const ticketsWithResponses = tickets.filter((t: any) => t.responses && t.responses.length > 0)
  if (ticketsWithResponses.length > 0) {
    const totalResponseTime = ticketsWithResponses.reduce((sum: number, t: any) => {
      const firstResponse = t.responses[0]
      const responseTime = new Date(firstResponse.createdAt).getTime() - new Date(t.createdAt).getTime()
      return sum + responseTime
    }, 0)
    supportData.stats.averageResponseTime = Math.round((totalResponseTime / ticketsWithResponses.length) / (1000 * 60 * 60) * 10) / 10
  }

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setIsViewModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsViewModalOpen(false)
    setSelectedTicketId(null)
  }

  // Show skeleton if no data
  if (!supportData || supportData.stats.totalTickets === 0 && supportData.recentTickets.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Support Statistics Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Search and Filters Skeleton */}
        <CardSkeleton className="h-32" />

        {/* Recent Tickets Skeleton */}
        <CardSkeleton className="h-96" />

        {/* Team Performance and Common Issues Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-64" />
          <CardSkeleton className="h-64" />
        </div>

        {/* Customer Satisfaction Trends Skeleton */}
        <CardSkeleton className="h-80" />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-red-600">Open</Badge>
      case 'in_progress':
        return <Badge variant="outline" className="text-yellow-600">In Progress</Badge>
      case 'resolved':
        return <Badge variant="outline" className="text-green-600">Resolved</Badge>
      case 'pending':
        return <Badge variant="outline" className="text-blue-600">Pending</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="outline" className="text-yellow-600">Medium</Badge>
      case 'low':
        return <Badge variant="outline" className="text-green-600">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Support Center</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage customer support tickets and monitor team performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Support Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Total Tickets" />
            <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.totalTickets}</div>
            <p className="text-sm text-muted-foreground">
              {/* TODO: Calculate tickets created this week for growth indicator */}
              All tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Open Tickets" />
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.openTickets}</div>
            <p className="text-sm text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Avg Response Time" />
            <Clock className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.averageResponseTime}h</div>
            <p className="text-sm text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Customer Satisfaction" />
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supportData.stats.customerSatisfaction > 0 ? `${supportData.stats.customerSatisfaction}/5` : '—'}
            </div>
            <p className="text-sm text-muted-foreground">
              {/* TODO: Implement customer satisfaction tracking:
                  - Add rating field to SupportTicketResponse model
                  - Calculate average rating from ticket responses */}
              {supportData.stats.customerSatisfaction > 0 ? 'Average rating' : 'Not available'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Search</CardTitle>
          <CardDescription>Find and filter support tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets by ID, title, customer, or description..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Support Tickets</CardTitle>
          <CardDescription>Latest customer support requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supportData.recentTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-4 flex-1">
                  {getStatusIcon(ticket.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{ticket.title}</h3>
                      <Badge variant="outline" className="text-xs font-mono">{ticket.ticketNumber || ticket.id.substring(0, 8).toUpperCase()}</Badge>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{ticket.customer.name} ({ticket.customer.orgName})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{ticket.category}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Response: {ticket.responseTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right text-sm">
                    <p className="font-medium">{ticket.assignedTo}</p>
                    <p className="text-gray-500">Assigned to</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewTicket(ticket.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleViewTicket(ticket.id)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance and Common Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Support team metrics and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportData.teamPerformance && supportData.teamPerformance.length > 0 ? (
                supportData.teamPerformance.map((team: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-gray-500">{team.activeTickets} active tickets</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{team.ticketsResolved} resolved</p>
                    <p className="text-sm text-gray-500">
                      {team.averageResponseTime}h avg • {team.customerRating}/5 rating
                    </p>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No team performance data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
            <CardDescription>Most frequently reported problems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportData.commonIssues && supportData.commonIssues.length > 0 ? (
                supportData.commonIssues.map((issue: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{issue.issue}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{issue.count} tickets</span>
                    <Badge variant="outline">{issue.percentage}%</Badge>
                  </div>
                </div>
              ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No common issues data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Satisfaction Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Satisfaction Trends</CardTitle>
          <CardDescription>Monthly customer satisfaction ratings and ticket volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Satisfaction trends chart</p>
              <p className="text-sm text-gray-400">Current rating: {supportData.stats.customerSatisfaction}/5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <SupportTicketDetailModal
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        ticketId={selectedTicketId}
        onUpdate={fetchTickets}
      />
    </div>
  )
}