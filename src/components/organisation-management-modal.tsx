'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, formatDate } from '@/lib/utils'
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
  Pause,
  Edit,
  Save,
  X,
  Plus,
  Search,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface OrgWithStats {
  id: string
  name: string
  slug: string
  timezone?: string
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

interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dateOfBirth: Date
  status: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'GRADUATED'
  attendanceRate: number
  parentName: string
  parentEmail: string
  parentPhone?: string
  createdAt: Date
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  subject: string
  experience: number
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
  classesCount: number
  studentsCount: number
  createdAt: Date
}

interface OrganisationManagementModalProps {
  isOpen: boolean
  onClose: () => void
  organisation: OrgWithStats | null
  initialTab?: 'overview' | 'students' | 'teachers' | 'settings' | 'account'
  onRefresh?: () => void
}

export function OrganisationManagementModal({ isOpen, onClose, organisation, initialTab = 'overview', onRefresh }: OrganisationManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'settings' | 'account'>(initialTab)
  const [isEditingOrg, setIsEditingOrg] = useState(false)
  const [isEditingStudent, setIsEditingStudent] = useState<string | null>(null)
  const [isEditingTeacher, setIsEditingTeacher] = useState<string | null>(null)
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [isAddingTeacher, setIsAddingTeacher] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Real data for students and teachers - fetched from API
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  
  // Organisation details - fetched from API
  const [orgDetails, setOrgDetails] = useState<any>(null)
  const [loadingOrgDetails, setLoadingOrgDetails] = useState(false)

  // Fetch organisation details, students and teachers when modal opens
  useEffect(() => {
    if (isOpen && organisation) {
      fetchOrgDetails()
      fetchStudents()
      fetchTeachers()
    } else {
      // Reset when modal closes
      setStudents([])
      setTeachers([])
      setOrgDetails(null)
    }
  }, [isOpen, organisation?.id])

  const fetchOrgDetails = async () => {
    if (!organisation?.id) return
    setLoadingOrgDetails(true)
    try {
      // Fetch full org data from database
      const response = await fetch(`/api/owner/orgs/${organisation.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrgDetails(data)
      }
    } catch (error) {
      console.error('Error fetching org details:', error)
    } finally {
      setLoadingOrgDetails(false)
    }
  }

  const fetchStudents = async () => {
    if (!organisation) return
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/owner/orgs/${organisation.id}/students`)
      if (response.ok) {
        const data = await response.json()
        // Transform API data to match Student interface
        const transformedStudents: Student[] = data.map((s: any) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email || '',
          phone: s.phone || undefined,
          dateOfBirth: s.dob ? new Date(s.dob) : new Date(),
          status: s.isArchived ? 'INACTIVE' : 'ACTIVE',
          attendanceRate: s.attendanceRate || 0,
          parentName: s.parentName || 'N/A',
          parentEmail: s.parentEmail || '',
          parentPhone: s.parentPhone || undefined,
          createdAt: new Date(s.createdAt)
        }))
        setStudents(transformedStudents)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchTeachers = async () => {
    if (!organisation) return
    setLoadingTeachers(true)
    try {
      const response = await fetch(`/api/owner/orgs/${organisation.id}/staff`)
      if (response.ok) {
        const data = await response.json()
        // Transform API data to match Teacher interface
        const transformedTeachers: Teacher[] = data.map((t: any) => ({
          id: t.id,
          firstName: t.firstName || t.name?.split(' ')[0] || '',
          lastName: t.lastName || t.name?.split(' ').slice(1).join(' ') || '',
          email: t.email || '',
          phone: t.phone || undefined,
          subject: t.subject || 'General',
          experience: t.experience || 0,
          status: t.status || 'ACTIVE',
          classesCount: t.classesCount || 0,
          studentsCount: t.studentsCount || 0,
          createdAt: new Date(t.createdAt || new Date())
        }))
        setTeachers(transformedTeachers)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setTeachers([])
    } finally {
      setLoadingTeachers(false)
    }
  }

  if (!organisation) return null

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'DEACTIVATED':
        return 'bg-red-100 text-red-800'
      case 'GRADUATED':
        return 'bg-blue-100 text-blue-800'
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSaveOrganisation = () => {
    // TODO: Implement save functionality
    setIsEditingOrg(false)
  }

  const handleSaveStudent = (studentId: string) => {
    // TODO: Implement save student functionality
    setIsEditingStudent(null)
  }

  const handleSaveTeacher = (teacherId: string) => {
    // TODO: Implement save teacher functionality
    setIsEditingTeacher(null)
  }

  const handleAddStudent = () => {
    setIsAddingStudent(true)
  }

  const handleAddTeacher = () => {
    setIsAddingTeacher(true)
  }

  const handleSaveNewStudent = () => {
    // TODO: Implement save new student functionality
    setIsAddingStudent(false)
  }

  const handleSaveNewTeacher = () => {
    // TODO: Implement save new teacher functionality
    setIsAddingTeacher(false)
  }

  const handleCancelAdd = () => {
    setIsAddingStudent(false)
    setIsAddingTeacher(false)
  }

  const handlePauseAccount = async () => {
    if (!organisation) return
    
    setIsChangingStatus(true)
    try {
      const response = await fetch(`/api/orgs/${organisation.id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: statusChangeReason || 'Account paused due to payment issues'
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        toast.error(result.error || result.details || 'Failed to pause account')
        return
      }
      
      if (result.success) {
        toast.success(`Account paused successfully! ${result.affectedUsers} admin/staff accounts have been locked.`)
        setStatusChangeReason('')
        if (onRefresh) onRefresh()
        onClose()
      } else {
        toast.error(result.error || result.details || 'Failed to pause account')
      }
    } catch (error: any) {
      toast.error(`Error pausing account: ${error?.message || 'Please try again.'}`)
    } finally {
      setIsChangingStatus(false)
    }
  }


  const handleReactivateAccount = () => {
    if (!organisation) return
    setShowReactivateConfirm(true)
  }

  const confirmReactivate = async () => {
    if (!organisation) return
    setShowReactivateConfirm(false)
    setIsChangingStatus(true)
    try {
      const response = await fetch(`/api/orgs/${organisation.id}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Account reactivated successfully! ${result.affectedUsers} admin/staff accounts have been restored.`)
        setStatusChangeReason('')
        if (onRefresh) onRefresh()
        onClose()
      } else {
        toast.error(result.error || 'Failed to reactivate account')
      }
    } catch (error) {
      toast.error('Error reactivating account. Please try again.')
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleDeactivateAccount = () => {
    if (!organisation) return
    setShowDeactivateConfirm(true)
  }

  const confirmDeactivate = async () => {
    if (!organisation) return
    setShowDeactivateConfirm(false)
    setIsChangingStatus(true)
    try {
      // Deactivate is the same as suspend - permanently disable
      const response = await fetch(`/api/orgs/${organisation.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: statusChangeReason || 'Account deactivated by platform administrator'
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Account deactivated successfully! ${result.affectedUsers} admin/staff accounts have been permanently locked.`)
        setStatusChangeReason('')
        if (onRefresh) onRefresh()
        onClose()
      } else {
        toast.error(result.error || 'Failed to deactivate account')
      }
    } catch (error) {
      toast.error('Error deactivating account. Please try again.')
    } finally {
      setIsChangingStatus(false)
    }
  }


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage ${organisation.name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{organisation.name}</h2>
            <p className="text-sm text-gray-500">{organisation.slug}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Active
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'students', label: `Students (${students.length})`, icon: Users },
              { id: 'teachers', label: `Teachers (${teachers.length})`, icon: UserCheck },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'account', label: 'Account', icon: Activity }
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <SplitTitle title="Students" />
                  <div className="p-2 rounded-full bg-blue-100 flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Organisation Information</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingOrg(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditingOrg ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="org-name">Organisation Name</Label>
                        <Input id="org-name" defaultValue={organisation.name} />
                      </div>
                      <div>
                        <Label htmlFor="org-slug">Slug</Label>
                        <Input id="org-slug" defaultValue={organisation.slug} />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveOrganisation}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditingOrg(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
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
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={handleAddStudent}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>

            <div className="space-y-4">
              {isAddingStudent && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <h3 className="font-medium text-blue-900">Add New Student</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-student-first">First Name</Label>
                          <Input id="new-student-first" placeholder="Enter first name" />
                        </div>
                        <div>
                          <Label htmlFor="new-student-last">Last Name</Label>
                          <Input id="new-student-last" placeholder="Enter last name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-student-email">Email</Label>
                          <Input id="new-student-email" placeholder="Enter email" />
                        </div>
                        <div>
                          <Label htmlFor="new-student-phone">Phone</Label>
                          <Input id="new-student-phone" placeholder="Enter phone" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-student-status">Status</Label>
                          <select id="new-student-status" className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="DEACTIVATED">Deactivated</option>
                            <option value="GRADUATED">Graduated</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-student-parent-name">Parent Name</Label>
                          <Input id="new-student-parent-name" placeholder="Enter parent name" />
                        </div>
                        <div>
                          <Label htmlFor="new-student-parent-email">Parent Email</Label>
                          <Input id="new-student-parent-email" placeholder="Enter parent email" />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveNewStudent}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Student
                        </Button>
                        <Button variant="outline" onClick={handleCancelAdd}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredStudents.map((student) => (
                <Card key={student.id}>
                  <CardContent className="p-4">
                    {isEditingStudent === student.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`student-first-${student.id}`}>First Name</Label>
                            <Input id={`student-first-${student.id}`} defaultValue={student.firstName} />
                          </div>
                          <div>
                            <Label htmlFor={`student-last-${student.id}`}>Last Name</Label>
                            <Input id={`student-last-${student.id}`} defaultValue={student.lastName} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`student-email-${student.id}`}>Email</Label>
                            <Input id={`student-email-${student.id}`} defaultValue={student.email} />
                          </div>
                          <div>
                            <Label htmlFor={`student-phone-${student.id}`}>Phone</Label>
                            <Input id={`student-phone-${student.id}`} defaultValue={student.phone || ''} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`student-status-${student.id}`}>Status</Label>
                            <select id={`student-status-${student.id}`} defaultValue={student.status} className="w-full p-2 border border-gray-300 rounded-md">
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="DEACTIVATED">Deactivated</option>
                              <option value="GRADUATED">Graduated</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => handleSaveStudent(student.id)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditingStudent(null)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium">{student.firstName} {student.lastName}</h3>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <p className="text-sm text-gray-500">Attendance: {student.attendanceRate}%</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(student.status)}>
                            {student.status}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingStudent(student.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
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
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
              <Button onClick={handleAddTeacher}>
                <Plus className="h-4 w-4 mr-2" />
                Add Teacher
              </Button>
            </div>

            <div className="space-y-4">
              {isAddingTeacher && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <h3 className="font-medium text-green-900">Add New Teacher</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-teacher-first">First Name</Label>
                          <Input id="new-teacher-first" placeholder="Enter first name" />
                        </div>
                        <div>
                          <Label htmlFor="new-teacher-last">Last Name</Label>
                          <Input id="new-teacher-last" placeholder="Enter last name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-teacher-email">Email</Label>
                          <Input id="new-teacher-email" placeholder="Enter email" />
                        </div>
                        <div>
                          <Label htmlFor="new-teacher-phone">Phone</Label>
                          <Input id="new-teacher-phone" placeholder="Enter phone" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new-teacher-subject">Subject</Label>
                          <Input id="new-teacher-subject" placeholder="Enter subject" />
                        </div>
                        <div>
                          <Label htmlFor="new-teacher-experience">Experience (years)</Label>
                          <Input id="new-teacher-experience" type="number" placeholder="Enter experience" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="new-teacher-status">Status</Label>
                        <select id="new-teacher-status" className="w-full p-2 border border-gray-300 rounded-md">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="ON_LEAVE">On Leave</option>
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleSaveNewTeacher}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Teacher
                        </Button>
                        <Button variant="outline" onClick={handleCancelAdd}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardContent className="p-4">
                    {isEditingTeacher === teacher.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`teacher-first-${teacher.id}`}>First Name</Label>
                            <Input id={`teacher-first-${teacher.id}`} defaultValue={teacher.firstName} />
                          </div>
                          <div>
                            <Label htmlFor={`teacher-last-${teacher.id}`}>Last Name</Label>
                            <Input id={`teacher-last-${teacher.id}`} defaultValue={teacher.lastName} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`teacher-email-${teacher.id}`}>Email</Label>
                            <Input id={`teacher-email-${teacher.id}`} defaultValue={teacher.email} />
                          </div>
                          <div>
                            <Label htmlFor={`teacher-phone-${teacher.id}`}>Phone</Label>
                            <Input id={`teacher-phone-${teacher.id}`} defaultValue={teacher.phone || ''} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`teacher-subject-${teacher.id}`}>Subject</Label>
                            <Input id={`teacher-subject-${teacher.id}`} defaultValue={teacher.subject} />
                          </div>
                          <div>
                            <Label htmlFor={`teacher-experience-${teacher.id}`}>Experience (years)</Label>
                            <Input id={`teacher-experience-${teacher.id}`} type="number" defaultValue={teacher.experience} />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`teacher-status-${teacher.id}`}>Status</Label>
                          <select id={`teacher-status-${teacher.id}`} defaultValue={teacher.status} className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ON_LEAVE">On Leave</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => handleSaveTeacher(teacher.id)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditingTeacher(null)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingTeacher(teacher.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organisation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea 
                    id="org-description" 
                    placeholder="Enter organisation description..." 
                    defaultValue={orgDetails?.description || ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="org-address">Address</Label>
                    <Input 
                      id="org-address" 
                      placeholder="Enter organisation address" 
                      defaultValue={orgDetails?.address || orgDetails?.addressLine1 || ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-phone">Phone</Label>
                    <Input 
                      id="org-phone" 
                      placeholder="Enter organisation phone" 
                      defaultValue={orgDetails?.phone || orgDetails?.publicPhone || ""}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="org-website">Website</Label>
                  <Input 
                    id="org-website" 
                    placeholder="https://example.com" 
                    defaultValue={orgDetails?.website || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="org-email">Contact Email</Label>
                  <Input 
                    id="org-email" 
                    placeholder="Enter contact email" 
                    defaultValue={orgDetails?.email || orgDetails?.publicEmail || ""}
                  />
                </div>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Status</CardTitle>
                <CardDescription>Manage organisation account status and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-medium text-green-900">Active</h3>
                    <p className="text-sm text-green-600">All accounts accessible</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Pause className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="font-medium text-orange-900">Paused</h3>
                    <p className="text-sm text-orange-600">Temporarily locked</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="font-medium text-red-900">Deactivated</h3>
                    <p className="text-sm text-red-600">Permanently locked</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Current Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                      <span className="text-sm text-gray-500">Since {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Last Payment</Label>
                      <p className="text-sm text-gray-600">2024-12-01</p>
                    </div>
                    <div>
                      <Label>Payment Failures</Label>
                      <p className="text-sm text-gray-600">0</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Actions</CardTitle>
                <CardDescription>Control organisation access and account status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status-reason">Reason for Status Change (Optional)</Label>
                    <Textarea
                      id="status-reason"
                      placeholder="Enter reason for pausing, deactivating, or reactivating account..."
                      value={statusChangeReason}
                      onChange={(e) => setStatusChangeReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium">Pause Account</h3>
                        <p className="text-sm text-gray-600">Temporarily lock all admin, staff, and teacher accounts. Use for billing issues like non-payment. Billing will continue.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={handlePauseAccount}
                        disabled={isChangingStatus}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        {isChangingStatus ? 'Pausing...' : 'Pause'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium">Deactivate Account</h3>
                        <p className="text-sm text-gray-600">Permanently disable organisation, cancel billing, and lock all accounts. Use when organisation has requested account deletion.</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleDeactivateAccount}
                        disabled={isChangingStatus}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {isChangingStatus ? 'Deactivating...' : 'Deactivate'}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-medium">Reactivate Account</h3>
                        <p className="text-sm text-gray-600">Restore full access to all accounts</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={handleReactivateAccount}
                        disabled={isChangingStatus}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isChangingStatus ? 'Reactivating...' : 'Reactivate'}
                      </Button>
                    </div>

                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">⚠️ Important</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>Pause:</strong> Temporarily locks accounts due to billing issues. Billing continues.</li>
                    <li>• <strong>Deactivate:</strong> Permanently disables organisation and cancels all billing. Use when organisation requests account deletion.</li>
                    <li>• Pausing or deactivating will lock ALL admin, staff, and teacher accounts</li>
                    <li>• Students and parents will still have access to their accounts</li>
                    <li>• You can reactivate the account at any time</li>
                  </ul>
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
        </div>
      </div>
      
      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showReactivateConfirm}
        onClose={() => setShowReactivateConfirm(false)}
        onConfirm={confirmReactivate}
        title="Reactivate Organisation"
        message="Are you sure you want to REACTIVATE this organisation? This will restore access to ALL admin, staff, and teacher accounts."
        confirmText="Reactivate"
        cancelText="Cancel"
        variant="default"
        isLoading={isChangingStatus}
      />
      
      <ConfirmationDialog
        isOpen={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
        onConfirm={confirmDeactivate}
        title="Deactivate Organisation"
        message="Are you sure you want to DEACTIVATE this organisation? This will permanently disable the organisation and lock all accounts. This action requires manual review to reverse."
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        isLoading={isChangingStatus}
      />
    </Modal>
  )
}
