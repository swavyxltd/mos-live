'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OrganizationManagementModal } from '@/components/organization-management-modal'
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
  status?: string // Organization status: ACTIVE, PAUSED, DEACTIVATED, etc.
  createdAt: Date
  updatedAt?: Date
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
    currentPeriodEnd?: Date
  } | null
  totalRevenue: number
  lastActivity: Date
}

interface OrganizationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  organization: OrgWithStats | null
  onRefresh?: () => void
}

export function OrganizationDetailModal({ isOpen, onClose, organization, onRefresh }: OrganizationDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'billing' | 'activity'>('overview')
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false)
  const [managementModalInitialTab, setManagementModalInitialTab] = useState<'overview' | 'students' | 'teachers' | 'settings'>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  // Demo data for students and teachers
  const students = [
    {
      id: '1',
      firstName: 'Ahmad',
      lastName: 'Hassan',
      email: 'ahmad@example.com',
      phone: '+44 7700 900123',
      dateOfBirth: new Date('2010-05-15'),
      grade: 'Year 6',
      status: 'ACTIVE' as const,
      attendanceRate: 95,
      parentName: 'Mohammed Hassan',
      parentEmail: 'm.hassan@example.com',
      parentPhone: '+44 7700 900124',
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      firstName: 'Fatima',
      lastName: 'Ali',
      email: 'fatima@example.com',
      phone: '+44 7700 900125',
      dateOfBirth: new Date('2011-08-22'),
      grade: 'Year 5',
      status: 'ACTIVE' as const,
      attendanceRate: 88,
      parentName: 'Sarah Ali',
      parentEmail: 's.ali@example.com',
      parentPhone: '+44 7700 900126',
      createdAt: new Date('2024-02-10')
    },
    {
      id: '3',
      firstName: 'Omar',
      lastName: 'Khan',
      email: 'omar@example.com',
      dateOfBirth: new Date('2009-12-03'),
      grade: 'Year 7',
      status: 'INACTIVE' as const,
      attendanceRate: 75,
      parentName: 'Ibrahim Khan',
      parentEmail: 'i.khan@example.com',
      createdAt: new Date('2024-01-20')
    }
  ]

  const teachers = [
    {
      id: '1',
      firstName: 'Sheikh',
      lastName: 'Abdullah',
      email: 'sheikh.abdullah@example.com',
      phone: '+44 7700 900127',
      subject: 'Quran & Islamic Studies',
      experience: 15,
      status: 'ACTIVE' as const,
      classesCount: 3,
      studentsCount: 25,
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      firstName: 'Ustadha',
      lastName: 'Aisha',
      email: 'ustadha.aisha@example.com',
      phone: '+44 7700 900128',
      subject: 'Arabic Language',
      experience: 8,
      status: 'ACTIVE' as const,
      classesCount: 2,
      studentsCount: 15,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '3',
      firstName: 'Imam',
      lastName: 'Yusuf',
      email: 'imam.yusuf@example.com',
      subject: 'Islamic History',
      experience: 12,
      status: 'ON_LEAVE' as const,
      classesCount: 1,
      studentsCount: 10,
      createdAt: new Date('2024-02-01')
    }
  ]

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleManageOrganization = () => {
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

  if (!organization) return null

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
    <Modal isOpen={isOpen} onClose={onClose} title={organization.name} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{organization.name}</h2>
            <p className="text-sm text-gray-500">{organization.slug}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(organization.status || (organization.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}>
              {getStatusIcon(organization.status || (organization.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
              {getStatusLabel(organization.status || (organization.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
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
              { id: 'students', label: `Students (${students.length})`, icon: Users },
              { id: 'teachers', label: `Teachers (${teachers.length})`, icon: UserCheck },
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
                      ? 'border-blue-500 text-blue-600'
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Students</p>
                      <p className="text-2xl font-bold">{organization._count.students}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Teachers</p>
                      <p className="text-2xl font-bold">{organization._count.teachers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <GraduationCap className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Classes</p>
                      <p className="text-2xl font-bold">{organization._count.classes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(organization.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organization Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organization Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Domain</p>
                      <p className="text-sm text-gray-500">{organization.slug}.madrasah-os.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Timezone</p>
                      <p className="text-sm text-gray-500">{organization.timezone || 'Europe/London'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-gray-500">{formatDate(organization.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Last Activity</p>
                      <p className="text-sm text-gray-500">{formatDate(organization.lastActivity)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Owner Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {organization.owner ? (
                    <>
                      <div className="flex items-center space-x-3">
                        <UserCheck className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm text-gray-500">{organization.owner.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-gray-500">{organization.owner.email}</p>
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
              {filteredStudents.map((student) => (
                <Card key={student.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-medium">{student.firstName} {student.lastName}</h3>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          <p className="text-sm text-gray-500">Grade: {student.grade} • Attendance: {student.attendanceRate}%</p>
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
              ))}
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
              {filteredTeachers.map((teacher) => (
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
              ))}
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
                {organization.platformBilling ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stripe Customer ID</span>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{organization.platformBilling.stripeCustomerId}</code>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge className={getStatusColor(organization.status || (organization.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}>
                        {getStatusLabel(organization.status || (organization.platformBilling ? 'ACTIVE' : 'SETUP_REQUIRED'))}
                      </Badge>
                    </div>
                    {organization.platformBilling.currentPeriodEnd && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Period End</span>
                        <span className="text-sm text-gray-500">{formatDate(organization.platformBilling.currentPeriodEnd)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-sm font-bold">{formatCurrency(organization.totalRevenue)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Not Set Up</h3>
                    <p className="text-sm text-gray-500 mb-4">This organization hasn't set up billing yet.</p>
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
                      <p className="text-sm font-medium">Organization created</p>
                      <p className="text-sm text-gray-500">{formatDate(organization.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Last activity</p>
                      <p className="text-sm text-gray-500">{formatDate(organization.lastActivity)}</p>
                    </div>
                  </div>
                  {organization._count.invoices > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{organization._count.invoices} overdue invoices</p>
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
          <Button onClick={handleManageOrganization}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Organization
          </Button>
        </div>
      </div>
    </Modal>
    
    <OrganizationManagementModal
      isOpen={isManagementModalOpen}
      onClose={handleCloseManagementModal}
      organization={organization}
      initialTab={managementModalInitialTab}
      onRefresh={onRefresh}
    />
  </>
  )
}
