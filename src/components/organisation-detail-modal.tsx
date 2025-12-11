'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OrganisationManagementModal } from '@/components/organisation-management-modal'
import { SplitTitle } from '@/components/ui/split-title'
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Settings,
  BarChart3,
  UserCheck,
  Clock,
  CreditCard,
  Globe,
  Search
} from 'lucide-react'

interface OrgWithStats {
  id: string
  name: string
  slug: string
  timezone?: string
  status?: string // Organisation status: ACTIVE, PAUSED, DEACTIVATED, etc.
  createdAt: Date | string
  updatedAt?: Date | string
  owner: {
    name: string | null
    email: string | null
  } | null
  _count: {
    students: number
    classes: number
    memberships: number
    invoices: number
    teachers: number
  }
  platformBilling: {
    stripeCustomerId: string
    status: string
    currentPeriodEnd?: Date | string
  } | null
  totalRevenue: number
  lastActivity: Date | string
}

interface OrganisationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  organisation: OrgWithStats | null
  onRefresh?: () => void
}

export function OrganisationDetailModal({ isOpen, onClose, organisation, onRefresh }: OrganisationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'billing' | 'activity'>('overview')
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false)
  const [managementModalInitialTab, setManagementModalInitialTab] = useState<'overview' | 'students' | 'teachers' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  // Fetch real students and teachers data from API
  useEffect(() => {
    if (isOpen && organisation) {
      if (activeTab === 'students') {
        fetchStudents()
      } else if (activeTab === 'teachers') {
        fetchTeachers()
      }
    }
  }, [isOpen, organisation?.id, activeTab])

  const fetchStudents = async () => {
    if (!organisation?.id) return
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/owner/orgs/${organisation.id}/students`)
      if (res.ok) {
        const data = await res.json()
        // Transform API data to match component expectations
        const transformed = data.map((s: any) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email || '',
          phone: s.phone || '',
          dateOfBirth: s.dob ? new Date(s.dob) : null,
          status: s.isArchived ? 'INACTIVE' as const : 'ACTIVE' as const,
          attendanceRate: s.attendanceRate || 0,
          parentName: s.parentName || 'N/A',
          parentEmail: s.parentEmail || '',
          parentPhone: s.parentPhone || '',
          createdAt: new Date(s.createdAt)
        }))
        setStudents(transformed)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchTeachers = async () => {
    if (!organisation?.id) return
    setLoadingTeachers(true)
    try {
      const res = await fetch(`/api/owner/orgs/${organisation.id}/staff`)
      if (res.ok) {
        const data = await res.json()
        // Transform API data to match component expectations
        const transformed = data.map((t: any) => ({
          id: t.id,
          firstName: t.name?.split(' ')[0] || '',
          lastName: t.name?.split(' ').slice(1).join(' ') || '',
          email: t.email || '',
          phone: t.phone || '',
          subject: t.subject || 'General',
          experience: t.experience || 0,
          status: t.status || 'ACTIVE' as const,
          classesCount: t.classesCount || 0,
          studentsCount: t.studentsCount || 0,
          createdAt: new Date(t.createdAt)
        }))
        setTeachers(transformed)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoadingTeachers(false)
    }
  }

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleManageOrganisation = () => {
    setManagementModalInitialTab('overview')
    setIsManagementModalOpen(true)
  }

  const handleSettingsClick = () => {
    setManagementModalInitialTab('settings')
    setIsManagementModalOpen(true)
  }

  const handleCloseManagementModal = () => {
    setIsManagementModalOpen(false)
  }

  if (!organisation) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800'
      case 'DEACTIVATED':
        return 'bg-red-100 text-red-800'
      case 'PAST_DUE':
        return 'bg-red-100 text-red-800'
      case 'CANCELED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />
      case 'PAUSED':
        return <Clock className="h-4 w-4" />
      case 'DEACTIVATED':
        return <AlertTriangle className="h-4 w-4" />
      case 'PAST_DUE':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active'
      case 'PAUSED':
        return 'Paused'
      case 'DEACTIVATED':
        return 'Deactivated'
      case 'PAST_DUE':
        return 'Past Due'
      case 'CANCELED':
        return 'Canceled'
      default:
        return 'Setup Required'
    }
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={organisation.name} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{organisation.name}</h2>
            <p className="text-sm text-gray-500">{organisation.slug}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(organisation.status || (organisation.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}>
              {getStatusIcon(organisation.status || (organisation.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
              {getStatusLabel(organisation.status || (organisation.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSettingsClick}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'students', label: `Students (${loadingStudents ? '...' : students.length})`, icon: Users },
              { id: 'teachers', label: `Teachers (${loadingTeachers ? '...' : teachers.length})`, icon: UserCheck },
              { id: 'billing', label: 'Billing', icon: CreditCard },
              { id: 'activity', label: 'Activity', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-gray-500 text-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <SplitTitle title="Students" />
                  <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {organisation._count.students}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <SplitTitle title="Teachers" />
                  <div className="p-2 rounded-full bg-orange-100 flex-shrink-0">
                    <UserCheck className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {organisation._count.teachers || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <SplitTitle title="Classes" />
                  <div className="p-2 rounded-full bg-green-100 flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {organisation._count.classes}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <SplitTitle title="Revenue" />
                  <div className="p-2 rounded-full bg-purple-100 flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(organisation.totalRevenue)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organisation Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organisation Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-gray-500">
                        {organisation.createdAt 
                          ? formatDate(new Date(organisation.createdAt)) 
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {organisation.updatedAt && (
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Last Updated</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(new Date(organisation.updatedAt))}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {organisation.owner ? (
                    <>
                      <div className="flex items-center space-x-3">
                        <UserCheck className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm text-gray-500">{organisation.owner.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-gray-500">{organisation.owner.email}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No owner information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <Button onClick={() => setIsManagementModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
            </div>

            <div className="space-y-4">
              {loadingStudents ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No students found</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{student.firstName} {student.lastName}</h3>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <p className="text-sm text-gray-500">Attendance: {student.attendanceRate}%</p>
                            <p className="text-sm text-gray-500">Parent: {student.parentName} ({student.parentEmail})</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search teachers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
              <Button onClick={() => setIsManagementModalOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Teachers
              </Button>
            </div>

            <div className="space-y-4">
              {loadingTeachers ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Loading teachers...</p>
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No teachers found</p>
                </div>
              ) : (
                filteredTeachers.map((teacher) => (
                  <Card key={teacher.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{teacher.firstName} {teacher.lastName}</h3>
                            <p className="text-sm text-gray-500">{teacher.email}</p>
                            <p className="text-sm text-gray-500">{teacher.subject} • {teacher.experience} years experience</p>
                            <p className="text-sm text-gray-500">{teacher.classesCount} classes • {teacher.studentsCount} students</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(teacher.status)}>
                            {teacher.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {organisation.platformBilling ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stripe Customer ID</span>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{organisation.platformBilling.stripeCustomerId}</code>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge className={getStatusColor(organisation.status || (organisation.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}>
                        {getStatusLabel(organisation.status || (organisation.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
                      </Badge>
                    </div>
                    {organisation.platformBilling.currentPeriodEnd && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Period End</span>
                        <span className="text-sm text-gray-500">{formatDate(organisation.platformBilling.currentPeriodEnd)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-sm font-bold">{formatCurrency(organisation.totalRevenue)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Not Set Up</h3>
                    <p className="text-sm text-gray-500 mb-4">This organisation hasn't set up billing yet.</p>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Billing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Organisation created</p>
                      <p className="text-sm text-gray-500">{formatDate(organisation.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last activity</p>
                      <p className="text-sm text-gray-500">{formatDate(organisation.lastActivity)}</p>
                    </div>
                  </div>
                  {organisation._count.invoices > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{organisation._count.invoices} overdue invoices</p>
                        <p className="text-sm text-gray-500">Requires attention</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleManageOrganisation}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Organisation
          </Button>
        </div>
      </div>
    </Modal>
    
    <OrganisationManagementModal
      isOpen={isManagementModalOpen}
      onClose={handleCloseManagementModal}
      organisation={organisation}
      initialTab={managementModalInitialTab}
      onRefresh={onRefresh}
    />
  </>
  )
}
