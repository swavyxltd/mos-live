import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default async function OwnerSupportPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // Fetch support tickets from API
  let supportData: any = {
    stats: {
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
      pendingTickets: 0,
      averageResponseTime: 0,
      customerSatisfaction: 0
    },
    recentTickets: [],
    teamPerformance: [],
    commonIssues: [],
    satisfactionTrends: []
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
    const ticketsRes = await fetch(`${baseUrl}/api/owner/support/tickets`, {
      cache: 'no-store'
    })
    
    if (ticketsRes.ok) {
      const tickets = await ticketsRes.json()
      
      // Format tickets for display
      supportData.recentTickets = tickets.slice(0, 10).map((ticket: any) => ({
        id: ticket.id,
        title: ticket.subject,
        description: ticket.body,
        status: ticket.status.toLowerCase(),
        priority: ticket.priority || 'medium',
        category: ticket.category || 'general',
        customer: {
          name: ticket.createdBy?.name || 'Unknown',
          email: ticket.createdBy?.email || '',
          orgName: ticket.org?.name || 'Unknown Org'
        },
        assignedTo: 'Unassigned', // Would need assignment tracking
        createdAt: ticket.createdAt,
        lastActivity: ticket.updatedAt,
        responseTime: ticket.responses && ticket.responses.length > 0 
          ? `${Math.floor((new Date(ticket.responses[0].createdAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60))} hours`
          : 'No response yet'
      }))

      // Calculate stats
      supportData.stats.totalTickets = tickets.length
      supportData.stats.openTickets = tickets.filter((t: any) => t.status === 'OPEN').length
      supportData.stats.resolvedTickets = tickets.filter((t: any) => t.status === 'RESOLVED').length
      supportData.stats.pendingTickets = tickets.filter((t: any) => t.status === 'PENDING').length
      
      // Calculate average response time (from first response)
      const ticketsWithResponses = tickets.filter((t: any) => t.responses && t.responses.length > 0)
      if (ticketsWithResponses.length > 0) {
        const totalResponseTime = ticketsWithResponses.reduce((sum: number, t: any) => {
          const firstResponse = t.responses[0]
          const responseTime = new Date(firstResponse.createdAt).getTime() - new Date(t.createdAt).getTime()
          return sum + responseTime
        }, 0)
        supportData.stats.averageResponseTime = Math.round((totalResponseTime / ticketsWithResponses.length) / (1000 * 60 * 60) * 10) / 10
      }
    }
  } catch (error) {
    console.error('Error fetching support tickets:', error)
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Support Center</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.averageResponseTime}h</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supportData.stats.customerSatisfaction}/5</div>
            <p className="text-xs text-muted-foreground">
              Average rating
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
                      <Badge variant="outline" className="text-xs">{ticket.id}</Badge>
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
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button size="sm">
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
              <p className="text-xs text-gray-400">Current rating: {supportData.stats.customerSatisfaction}/5</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}