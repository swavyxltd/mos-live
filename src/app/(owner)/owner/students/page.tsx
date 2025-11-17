'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SplitTitle } from '@/components/ui/split-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  UserCheck,
  Calendar,
  Heart,
  AlertTriangle,
  Search,
  X,
  RefreshCw,
  Eye,
  Edit
} from 'lucide-react'
import { EditStudentModal } from '@/components/edit-student-modal'
import { StudentDetailModal } from '@/components/student-detail-modal'
import { toast } from 'sonner'

export default function OwnerStudentsPage() {
  const { data: session, status } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [allergiesFilter, setAllergiesFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session?.user?.id) {
    return <div>Please sign in to access this page.</div>
  }

  // Student management data
  const [studentData, setStudentData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  
  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [allClasses, setAllClasses] = useState<any[]>([])

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/owner/students/stats')
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Received students data:', {
          totalStudents: data.stats?.totalStudents,
          allStudentsCount: data.allStudents?.length
        })
        setStudentData(data)
        
        // Extract all unique classes from all students
        const classesMap = new Map<string, { id: string; name: string }>()
        data.allStudents?.forEach((student: any) => {
          if (student.classes && Array.isArray(student.classes)) {
            student.classes.forEach((cls: any) => {
              if (cls && cls.id && cls.name && !classesMap.has(cls.id)) {
                classesMap.set(cls.id, { id: cls.id, name: cls.name })
              }
            })
          }
        })
        setAllClasses(Array.from(classesMap.values()))
      } else {
        const errorData = await response.json().catch(() => null)
      }
    } catch (err) {
    } finally {
      setDataLoading(false)
    }
  }

  // Fetch student data
  useEffect(() => {
    if (status === 'loading') return
    fetchStudents()
  }, [status])

  if (status === 'loading' || dataLoading || !studentData) {
    return <div>Loading...</div>
  }

  // Get unique classes from all students for filter dropdown
  const uniqueClassesSet = new Set<string>()
  studentData.allStudents?.forEach((student: any) => {
    if (student.classes && Array.isArray(student.classes)) {
      student.classes.forEach((cls: any) => {
        if (cls && cls.name) {
          uniqueClassesSet.add(cls.name)
        }
      })
    }
  })
  const uniqueClasses = Array.from(uniqueClassesSet)

  // Get unique organizations for filter
  const uniqueOrgs = [...new Set((studentData.allStudents || []).map((student: any) => student.orgName))]

  // Filter students based on search and filters
  let filteredStudents = (studentData.allStudents || []).filter((student: any) => {
    const matchesSearch = !searchTerm || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.orgName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    const matchesOrg = orgFilter === 'all' || student.orgName === orgFilter
    const matchesClass = classFilter === 'all' || (student.classes && Array.isArray(student.classes) && student.classes.some((cls: any) => cls.name === classFilter))
    const matchesAllergies = allergiesFilter === 'all' || 
      (allergiesFilter === 'has' && student.allergies && student.allergies !== 'None') ||
      (allergiesFilter === 'none' && (!student.allergies || student.allergies === 'None'))
    
    return matchesSearch && matchesStatus && matchesOrg && matchesClass && matchesAllergies
  })

  // Sort students alphabetically by firstName, then lastName (A-Z)
  filteredStudents = filteredStudents.sort((a: any, b: any) => {
    const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
    if (firstNameCompare !== 0) return firstNameCompare
    return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
  })

  // Handler functions
  const handleRefresh = async () => {
    setRefreshing(true)
    setDataLoading(true)
    try {
      await fetchStudents()
    } catch (error) {
    } finally {
      setRefreshing(false)
      setDataLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setOrgFilter('all')
    setClassFilter('all')
    setAllergiesFilter('all')
  }

  const handleViewStudent = async (student: any) => {
    try {
      // Fetch full student details
      const response = await fetch(`/api/owner/students/${student.id}`)
      if (response.ok) {
        const fullStudent = await response.json()
        // Transform to match StudentDetailModal format
        const detailStudent = {
          ...fullStudent,
          name: `${fullStudent.firstName} ${fullStudent.lastName}`,
          class: fullStudent.classes?.[0]?.name || 'N/A',
          teacher: 'N/A', // Would need to fetch from class
          overallAttendance: fullStudent.attendanceRate || 0,
          weeklyAttendance: [], // Would need to fetch from attendance API
          recentTrend: 'stable' as const
        }
        setSelectedStudent(detailStudent)
        setIsViewModalOpen(true)
      } else {
        toast.error('Failed to load student details')
      }
    } catch (error) {
      toast.error('Failed to load student details')
    }
  }

  const handleEditStudent = async (student: any) => {
    try {
      // Fetch full student details
      const response = await fetch(`/api/owner/students/${student.id}`)
      if (response.ok) {
        const fullStudent = await response.json()
        setSelectedStudent(fullStudent)
        setIsEditModalOpen(true)
      } else {
        toast.error('Failed to load student details')
      }
    } catch (error) {
      toast.error('Failed to load student details')
    }
  }

  const handleStudentUpdated = (updatedStudent: any) => {
    // Refresh the student list
    fetchStudents()
    setIsEditModalOpen(false)
    setSelectedStudent(null)
    toast.success('Student updated successfully!')
  }

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedStudent(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedStudent(null)
  }

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE' ? (
      <Badge variant="outline" className="text-green-600 bg-green-50 border-0 dark:bg-green-950 dark:text-green-200">Active</Badge>
    ) : (
      <Badge variant="outline" className="text-red-600 bg-red-50 border-0 dark:bg-red-950 dark:text-red-200">Inactive</Badge>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Student Management</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">
            Manage all students across your platform and monitor student activity
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="whitespace-nowrap">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            <span className="sm:hidden">{refreshing ? '...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Student Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Total Students" />
            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData?.stats?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{studentData?.stats?.newStudentsThisMonth || 0}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="Active Students" />
            <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData?.stats?.activeStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {studentData?.stats?.totalStudents ? Math.round((studentData.stats.activeStudents / studentData.stats.totalStudents) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="With Allergies" />
            <Heart className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData?.stats?.studentsWithAllergies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require special attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <SplitTitle title="New This Month" />
            <Calendar className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData?.stats?.newStudentsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent enrollments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Student Search & Filters</CardTitle>
          <CardDescription>Find and filter students across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search students by name, parent, or organization..."
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
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                <Label htmlFor="class-filter">Class</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {uniqueClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="allergies-filter">Allergies</Label>
                <Select value={allergiesFilter} onValueChange={setAllergiesFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="has">With Allergies</SelectItem>
                    <SelectItem value="none">No Allergies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 break-words">
                Showing {filteredStudents.length} of {studentData?.allStudents?.length || 0} students
                {(searchTerm || statusFilter !== 'all' || orgFilter !== 'all' || classFilter !== 'all' || allergiesFilter !== 'all') && (
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

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            {filteredStudents.length === (studentData?.allStudents?.length || 0)
              ? 'All students in the platform' 
              : `Filtered results (${filteredStudents.length} of ${studentData?.allStudents?.length || 0})`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student: any) => (
                <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full min-w-0">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-gray-600">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {student.parentName && `Parent: ${student.parentName}`}
                        {student.parentEmail && ` • ${student.parentEmail}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{student.orgName || 'Unknown'}</p>
                      {student.classes && Array.isArray(student.classes) && student.classes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.classes.slice(0, 2).map((cls: any) => (
                            <Badge key={cls?.id || cls?.name} variant="outline" className="text-xs">
                              {cls?.name || 'Unknown'}
                            </Badge>
                          ))}
                          {student.classes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.classes.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 shrink-0 sm:flex-nowrap">
                    {getStatusBadge(student.status)}
                    {student.allergies && student.allergies !== 'None' && (
                      <Badge variant="outline" className="text-red-600 flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span className="hidden sm:inline">Allergies</span>
                      </Badge>
                    )}
                    {student.attendanceRate < 86 && (
                      <Badge variant="outline" className="text-yellow-600 flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden sm:inline">Low Attendance</span>
                      </Badge>
                    )}
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="shrink-0"
                        onClick={() => handleViewStudent(student)}
                        title="View student details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="shrink-0"
                        onClick={() => handleEditStudent(student)}
                        title="Edit student"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No students found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Organizations by Students */}
      {studentData?.topOrgsByStudents && studentData.topOrgsByStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Organizations by Students</CardTitle>
            <CardDescription>Organizations with the most students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentData.topOrgsByStudents.map((org: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{org.orgName}</p>
                      <p className="text-sm text-gray-500">{org.studentCount} total students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{org.activeStudents} active</p>
                    <p className="text-sm text-gray-500">
                      {org.studentCount > 0 ? Math.round((org.activeStudents / org.studentCount) * 100) : 0}% active
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Student Modal */}
      <StudentDetailModal
        student={selectedStudent}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        onEdit={handleEditStudent}
        classes={allClasses}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleStudentUpdated}
        student={selectedStudent}
        classes={allClasses}
      />
    </div>
  )
}

