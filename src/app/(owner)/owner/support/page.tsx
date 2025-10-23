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

  // Support center data
  const supportData = {
    // Support statistics
    stats: {
      totalTickets: 47,
      openTickets: 12,
      resolvedTickets: 33,
      pendingTickets: 2,
      averageResponseTime: 2.5,
      customerSatisfaction: 4.7
    },
    
    // Recent tickets
    recentTickets: [
      {
        id: 'TICKET-001',
        title: 'Payment processing issue',
        description: 'Unable to process monthly subscription payment',
        status: 'open',
        priority: 'high',
        category: 'billing',
        customer: {
          name: 'Ahmed Hassan',
          email: 'ahmed@leicester-islamic.org',
          orgName: 'Leicester Islamic Centre'
        },
        assignedTo: 'Support Team',
        createdAt: '2024-12-06T10:30:00Z',
        lastActivity: '2024-12-06T14:20:00Z',
        responseTime: '3.8 hours'
      },
      {
        id: 'TICKET-002',
        title: 'Student enrollment not working',
        description: 'Getting error when trying to enroll new students',
        status: 'in_progress',
        priority: 'medium',
        category: 'technical',
        customer: {
          name: 'Fatima Ali',
          email: 'fatima@manchester-islamic.edu',
          orgName: 'Manchester Islamic School'
        },
        assignedTo: 'Technical Team',
        createdAt: '2024-12-06T09:15:00Z',
        lastActivity: '2024-12-06T11:45:00Z',
        responseTime: '2.5 hours'
      },
      {
        id: 'TICKET-003',
        title: 'Report generation slow',
        description: 'Attendance reports taking too long to generate',
        status: 'resolved',
        priority: 'low',
        category: 'performance',
        customer: {
          name: 'Moulana Omar',
          email: 'omar@birmingham-quran.org',
          orgName: 'Birmingham Quran Academy'
        },
        assignedTo: 'Development Team',
        createdAt: '2024-12-05T16:20:00Z',
        lastActivity: '2024-12-06T08:30:00Z',
        responseTime: '16.2 hours'
      },
      {
        id: 'TICKET-004',
        title: 'Login issues for staff members',
        description: 'Some staff members cannot log into their accounts',
        status: 'open',
        priority: 'high',
        category: 'authentication',
        customer: {
          name: 'Sarah Ahmed',
          email: 'sarah@leeds-islamic.edu',
          orgName: 'Leeds Islamic School'
        },
        assignedTo: 'Support Team',
        createdAt: '2024-12-05T14:10:00Z',
        lastActivity: '2024-12-05T15:30:00Z',
        responseTime: '1.3 hours'
      },
      {
        id: 'TICKET-005',
        title: 'Feature request: Bulk student import',
        description: 'Would like to import multiple students at once',
        status: 'pending',
        priority: 'low',
        category: 'feature_request',
        customer: {
          name: 'Hassan Khan',
          email: 'hassan@london-islamic.org',
          orgName: 'London Islamic Centre'
        },
        assignedTo: 'Product Team',
        createdAt: '2024-12-04T11:45:00Z',
        lastActivity: '2024-12-04T12:00:00Z',
        responseTime: '15 minutes'
      }
    ],
    
    // Support team performance
    teamPerformance: [
      {
        name: 'Support Team',
        ticketsResolved: 18,
        averageResponseTime: 2.1,
        customerRating: 4.8,
        activeTickets: 5
      },
      {
        name: 'Technical Team',
        ticketsResolved: 12,
        averageResponseTime: 3.2,
        customerRating: 4.6,
        activeTickets: 4
      },
      {
        name: 'Development Team',
        ticketsResolved: 8,
        averageResponseTime: 4.5,
        customerRating: 4.7,
        activeTickets: 2
      },
      {
        name: 'Product Team',
        ticketsResolved: 3,
        averageResponseTime: 1.8,
        customerRating: 4.9,
        activeTickets: 1
      }
    ],
    
    // Common issues
    commonIssues: [
      { issue: 'Payment processing errors', count: 8, percentage: 17 },
      { issue: 'Login/authentication problems', count: 6, percentage: 13 },
      { issue: 'Student enrollment issues', count: 5, percentage: 11 },
      { issue: 'Report generation slow', count: 4, percentage: 9 },
      { issue: 'Email notifications not sending', count: 3, percentage: 6 },
      { issue: 'Mobile app crashes', count: 2, percentage: 4 }
    ],
    
    // Customer satisfaction trends
    satisfactionTrends: [
      { month: 'Jan 2024', rating: 4.2, tickets: 12 },
      { month: 'Feb 2024', rating: 4.3, tickets: 15 },
      { month: 'Mar 2024', rating: 4.4, tickets: 18 },
      { month: 'Apr 2024', rating: 4.5, tickets: 22 },
      { month: 'May 2024', rating: 4.6, tickets: 25 },
      { month: 'Jun 2024', rating: 4.7, tickets: 28 },
      { month: 'Jul 2024', rating: 4.6, tickets: 31 },
      { month: 'Aug 2024', rating: 4.7, tickets: 35 },
      { month: 'Sep 2024', rating: 4.8, tickets: 38 },
      { month: 'Oct 2024', rating: 4.7, tickets: 42 },
      { month: 'Nov 2024', rating: 4.8, tickets: 45 },
      { month: 'Dec 2024', rating: 4.7, tickets: 47 }
    ]
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
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
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
              {supportData.teamPerformance.map((team, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
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
              ))}
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
              {supportData.commonIssues.map((issue, index) => (
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
              ))}
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