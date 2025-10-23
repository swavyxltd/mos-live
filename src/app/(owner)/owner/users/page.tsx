import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  UserPlus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Shield,
  Crown,
  UserCheck,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity
} from 'lucide-react'

export default async function OwnerUsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  // User management data
  const userData = {
    // User statistics
    stats: {
      totalUsers: 89,
      activeUsers: 76,
      newUsersThisMonth: 12,
      adminUsers: 8,
      staffUsers: 45,
      parentUsers: 36,
      inactiveUsers: 13
    },
    
    // Recent users
    recentUsers: [
      {
        id: 'user-001',
        name: 'Ahmed Hassan',
        email: 'ahmed@leicester-islamic.org',
        role: 'OWNER',
        orgName: 'Leicester Islamic Centre',
        lastActive: '2024-12-06T10:30:00Z',
        status: 'active',
        joinDate: '2024-01-15'
      },
      {
        id: 'user-002',
        name: 'Fatima Ali',
        email: 'fatima@manchester-islamic.edu',
        role: 'ADMIN',
        orgName: 'Manchester Islamic School',
        lastActive: '2024-12-06T09:15:00Z',
        status: 'active',
        joinDate: '2024-02-20'
      },
      {
        id: 'user-003',
        name: 'Moulana Omar',
        email: 'omar@birmingham-quran.org',
        role: 'STAFF',
        orgName: 'Birmingham Quran Academy',
        lastActive: '2024-12-05T16:45:00Z',
        status: 'active',
        joinDate: '2024-03-10'
      },
      {
        id: 'user-004',
        name: 'Sarah Ahmed',
        email: 'sarah@leeds-islamic.edu',
        role: 'PARENT',
        orgName: 'Leeds Islamic School',
        lastActive: '2024-12-05T14:20:00Z',
        status: 'active',
        joinDate: '2024-04-05'
      },
      {
        id: 'user-005',
        name: 'Hassan Khan',
        email: 'hassan@london-islamic.org',
        role: 'STAFF',
        orgName: 'London Islamic Centre',
        lastActive: '2024-12-04T11:30:00Z',
        status: 'inactive',
        joinDate: '2024-05-12'
      }
    ],
    
    // User activity summary
    activity: {
      loginsToday: 23,
      loginsThisWeek: 156,
      averageSessionDuration: 24.5,
      mostActiveTime: '10:00 AM - 12:00 PM',
      topFeatures: ['Dashboard', 'Students', 'Classes', 'Payments', 'Messages']
    },
    
    // Role distribution
    roleDistribution: [
      { role: 'OWNER', count: 8, percentage: 9 },
      { role: 'ADMIN', count: 12, percentage: 13 },
      { role: 'STAFF', count: 45, percentage: 51 },
      { role: 'PARENT', count: 24, percentage: 27 }
    ],
    
    // Organizations with most users
    topOrgsByUsers: [
      { orgName: 'Leicester Islamic Centre', userCount: 8, activeUsers: 7 },
      { orgName: 'Manchester Islamic School', userCount: 6, activeUsers: 5 },
      { orgName: 'Birmingham Quran Academy', userCount: 5, activeUsers: 4 },
      { orgName: 'London Islamic Centre', userCount: 4, activeUsers: 3 },
      { orgName: 'Bradford Islamic School', userCount: 3, activeUsers: 3 }
    ]
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'
      case 'ADMIN': return 'secondary'
      case 'STAFF': return 'outline'
      case 'PARENT': return 'outline'
      default: return 'outline'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-3 w-3" />
      case 'ADMIN': return <Shield className="h-3 w-3" />
      case 'STAFF': return <UserCheck className="h-3 w-3" />
      case 'PARENT': return <Users className="h-3 w-3" />
      default: return <Users className="h-3 w-3" />
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="outline" className="text-green-600">Active</Badge>
    ) : (
      <Badge variant="outline" className="text-red-600">Inactive</Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">User Management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage all users across your platform and monitor user activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{userData.stats.newUsersThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((userData.stats.activeUsers / userData.stats.totalUsers) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              Platform administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Users</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.staffUsers}</div>
            <p className="text-xs text-muted-foreground">
              Organization staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Search</CardTitle>
          <CardDescription>Find and filter users across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or organization..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Users and Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Latest users added to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userData.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center space-x-1">
                      {getRoleIcon(user.role)}
                      <span>{user.role}</span>
                    </Badge>
                    {getStatusBadge(user.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
            <CardDescription>Breakdown of users by role type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userData.roleDistribution.map((role) => (
                <div key={role.role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{role.role}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{role.count} users</span>
                    <Badge variant="outline">{role.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity and Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity Summary</CardTitle>
            <CardDescription>Platform usage and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Logins Today</span>
                </div>
                <Badge variant="outline">{userData.activity.loginsToday}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Logins This Week</span>
                </div>
                <Badge variant="outline">{userData.activity.loginsThisWeek}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Avg Session Duration</span>
                </div>
                <Badge variant="outline">{userData.activity.averageSessionDuration} min</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Most Active Time</span>
                </div>
                <Badge variant="outline">{userData.activity.mostActiveTime}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Organizations by Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations by Users</CardTitle>
            <CardDescription>Organizations with the most active users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userData.topOrgsByUsers.map((org, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{org.orgName}</p>
                      <p className="text-sm text-gray-500">{org.userCount} total users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{org.activeUsers} active</p>
                    <p className="text-sm text-gray-500">
                      {Math.round((org.activeUsers / org.userCount) * 100)}% active
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

