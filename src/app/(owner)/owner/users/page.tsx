'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
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
  Activity,
  X,
  RefreshCw
} from 'lucide-react'

export default function OwnerUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportFields, setExportFields] = useState({
    name: true,
    email: true,
    role: true,
    organization: true,
    status: true,
    joinDate: true,
    lastActive: true,
    phone: true,
    location: true,
    studentName: false,
    studentDOB: false,
    parentName: false,
    parentEmail: false,
    parentPhone: false
  })
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session?.user?.id) {
    return <div>Please sign in to access this page.</div>
  }

  // User management data
  const [userData, setUserData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/owner/users/stats')
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Received users data:', {
          totalUsers: data.stats?.totalUsers,
          allUsersCount: data.allUsers?.length
        })
        setUserData(data)
      } else {
        const errorData = await response.json().catch(() => null)
      }
    } catch (err) {
    } finally {
      setDataLoading(false)
    }
  }

  // Fetch user data
  useEffect(() => {
    if (status === 'loading') return
    fetchUsers()
  }, [status])

  if (status === 'loading' || dataLoading || !userData) {
    return <div>Loading...</div>
  }

  // Filter users based on search and filters
  const filteredUsers = (userData.allUsers || []).filter(user => {
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.orgName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    const matchesOrg = orgFilter === 'all' || user.orgName === orgFilter
    
    // Date filter logic
    let matchesDate = true
    if (dateFilter !== 'all') {
      const userJoinDate = new Date(user.joinDate)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - userJoinDate.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0
          break
        case 'week':
          matchesDate = daysDiff <= 7
          break
        case 'month':
          matchesDate = daysDiff <= 30
          break
        case 'quarter':
          matchesDate = daysDiff <= 90
          break
        case 'year':
          matchesDate = daysDiff <= 365
          break
      }
    }
    
    return matchesSearch && matchesRole && matchesStatus && matchesOrg && matchesDate
  })

  // Get unique organizations for filter
  const uniqueOrgs = [...new Set((userData.allUsers || []).map(user => user.orgName))]

  // Handler functions
  const handleRefresh = async () => {
    setRefreshing(true)
    setDataLoading(true)
    try {
      await fetchUsers()
    } catch (error) {
    } finally {
      setRefreshing(false)
      setDataLoading(false)
    }
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const executeExport = () => {
    // Build export data based on selected fields
    const exportData = filteredUsers.map(user => {
      const row: any = {}
      
      if (exportFields.name) row.Name = user.name
      if (exportFields.email) row.Email = user.email
      if (exportFields.role) row.Role = user.role
      if (exportFields.organization) row.Organization = user.orgName
      if (exportFields.status) row.Status = user.status
      if (exportFields.joinDate) row['Join Date'] = user.joinDate
      if (exportFields.lastActive) row['Last Active'] = user.lastActive
      if (exportFields.phone) row.Phone = user.phone
      if (exportFields.location) row.Location = user.location
      
      // Add student data if user has students and fields are selected
      if (user.students && user.students.length > 0) {
        if (exportFields.studentName) {
          row['Student Names'] = user.students.map(s => s.name).join('; ')
        }
        if (exportFields.studentDOB) {
          row['Student DOBs'] = user.students.map(s => s.dob).join('; ')
        }
        if (exportFields.parentName) {
          row['Parent Name'] = user.name
        }
        if (exportFields.parentEmail) {
          row['Parent Email'] = user.email
        }
        if (exportFields.parentPhone) {
          row['Parent Phone'] = user.phone
        }
      }
      
      return row
    })
    
    if (exportData.length === 0) {
      alert('No data to export')
      return
    }
    
    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`
    a.click()
    window.URL.revokeObjectURL(url)
    
    setIsExportModalOpen(false)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('all')
    setStatusFilter('all')
    setOrgFilter('all')
    setDateFilter('all')
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
      <Badge variant="outline" className="text-green-600 bg-green-50 border-0">Active</Badge>
    ) : (
      <Badge variant="outline" className="text-red-600 bg-red-50 border-0">Inactive</Badge>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">User Management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">
            Manage all users across your platform and monitor user activity
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="whitespace-nowrap">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" onClick={() => router.push('/owner/users/create')} className="whitespace-nowrap">
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Total Users" />
            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{userData?.stats?.newUsersThisMonth || 0}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Active Users" />
            <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userData?.stats?.totalUsers ? Math.round((userData.stats.activeUsers / userData.stats.totalUsers) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Admin Users" />
            <Shield className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.stats?.adminUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Platform administrators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Staff Users" />
            <UserCheck className="h-4 w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.stats?.staffUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Organization staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Search & Filters</CardTitle>
          <CardDescription>Find and filter users across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name, email, or organization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <Button variant="outline" onClick={clearFilters} className="whitespace-nowrap shrink-0">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="role-filter">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="org-filter">Organization</Label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {uniqueOrgs.map(org => (
                      <SelectItem key={org} value={org}>{org}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-filter">Join Date</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 break-words">
                Showing {filteredUsers.length} of {userData?.allUsers?.length || 0} users
                {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all' || dateFilter !== 'all') && (
                  <span className="ml-2 text-blue-600">(filtered)</span>
                )}
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length === (userData?.allUsers?.length || 0)
              ? 'All users in the platform' 
              : `Filtered results (${filteredUsers.length} of ${userData?.allUsers?.length || 0})`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-gray-600">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-gray-400 truncate">{user.orgName}</p>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 shrink-0 sm:flex-nowrap">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center space-x-1 whitespace-nowrap">
                      {getRoleIcon(user.role)}
                      <span className="hidden sm:inline">{user.role}</span>
                      <span className="sm:hidden">{user.role.substring(0, 3)}</span>
                    </Badge>
                    {getStatusBadge(user.status)}
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="shrink-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="shrink-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No users found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}
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
            {(userData?.roleDistribution || []).map((role) => (
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
                <Badge variant="outline">{userData?.activity?.loginsToday || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Logins This Week</span>
                </div>
                <Badge variant="outline">{userData?.activity?.loginsThisWeek || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Avg Session Duration</span>
                </div>
                <Badge variant="outline">{userData?.activity?.averageSessionDuration || 0} min</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Most Active Time</span>
                </div>
                <Badge variant="outline">{userData?.activity?.mostActiveTime || 'N/A'}</Badge>
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
              {(userData?.topOrgsByUsers || []).map((org, index) => (
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

      {/* Export Modal */}
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Export Users Data</h2>
          <p className="text-sm text-gray-600 mb-6">
            Export {filteredUsers.length} filtered users with selected fields
          </p>
          
          <div className="space-y-6">
            {/* Export Format */}
            <div>
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field Selection */}
            <div>
              <Label className="text-base font-medium">Select Fields to Export</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">User Information</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.name}
                        onChange={(e) => setExportFields(prev => ({ ...prev, name: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Name</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.email}
                        onChange={(e) => setExportFields(prev => ({ ...prev, email: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.role}
                        onChange={(e) => setExportFields(prev => ({ ...prev, role: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Role</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.organization}
                        onChange={(e) => setExportFields(prev => ({ ...prev, organization: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Organization</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.status}
                        onChange={(e) => setExportFields(prev => ({ ...prev, status: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Status</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.phone}
                        onChange={(e) => setExportFields(prev => ({ ...prev, phone: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Phone</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.location}
                        onChange={(e) => setExportFields(prev => ({ ...prev, location: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Location</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Student & Parent Data</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.studentName}
                        onChange={(e) => setExportFields(prev => ({ ...prev, studentName: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Student Names</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.studentDOB}
                        onChange={(e) => setExportFields(prev => ({ ...prev, studentDOB: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Student DOBs</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.parentName}
                        onChange={(e) => setExportFields(prev => ({ ...prev, parentName: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Parent Name</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.parentEmail}
                        onChange={(e) => setExportFields(prev => ({ ...prev, parentEmail: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Parent Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportFields.parentPhone}
                        onChange={(e) => setExportFields(prev => ({ ...prev, parentPhone: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm">Parent Phone</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Export Summary</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• {filteredUsers.length} users will be exported</p>
                <p>• Format: {exportFormat.toUpperCase()}</p>
                <p>• Fields selected: {Object.values(exportFields).filter(Boolean).length}</p>
                {filteredUsers.some(u => u.students && u.students.length > 0) && (
                  <p>• Includes student data for parents with children</p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

