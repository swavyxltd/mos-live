'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  GraduationCap,
  UserCheck,
  Archive,
  ArchiveRestore,
  Edit,
  Calendar,
  DollarSign,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  Send,
} from 'lucide-react'
import { getAttendanceRating } from '@/lib/attendance-ratings'
import { PhoneLink } from './phone-link'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { SendMessageModal } from './send-message-modal'

// Comprehensive student data interface
interface StudentDetailsData {
  id: string
  firstName: string
  lastName: string
  name: string
  dateOfBirth: string | null
  age: number
  allergies: string | null
  medicalNotes: string | null
  enrollmentDate: string
  status: 'ACTIVE' | 'ARCHIVED'
  isArchived: boolean
  archivedAt: string | null
  studentId: string
  classes: Array<{
    id: string
    name: string
    teacher: {
      id: string
      name: string
      email: string
    } | null
  }>
  parents: Array<{
    id: string
    name: string
    email: string
    phone: string | null
    backupPhone: string | null
    isPrimary: boolean
  }>
  attendance: {
    overall: number
    stats: {
      present: number
      absent: number
      late: number
      total: number
    }
    recent: Array<{
      id: string
      date: string
      status: string
      time: string | null
      class: {
        id: string
        name: string
      } | null
    }>
  }
  fees: {
    currentBalance: number
    totalPaidThisYear: number
    paymentRecords: Array<{
      id: string
      month: string
      amountP: number
      method: string | null
      status: string
      paidAt: string | null
      notes: string | null
      reference: string | null
      class: {
        id: string
        name: string
      } | null
      createdAt: string
    }>
    invoices: Array<{
      id: string
      invoiceNumber: string | null
      amountP: number
      currency: string
      status: string
      dueDate: string | null
      paidAt: string | null
      createdAt: string
    }>
  }
  notes: Array<{
    id: string
    body: string
    createdAt: string
    author: {
      id: string
      name: string
      email: string
    } | null
  }>
  activity: Array<{
    id: string
    action: string
    targetType: string
    data: any
    createdAt: string
    actor: {
      id: string
      name: string
      email: string
    } | null
  }>
}

interface StudentDetailModalProps {
  studentId?: string | null // New: fetch from API
  student?: any | null // Legacy: pass student object
  isOpen: boolean
  onClose: () => void
  onEdit?: (studentId: string) => void
  onArchive?: (studentId: string, isArchived: boolean) => void
}

export function StudentDetailModal({ 
  studentId,
  student: legacyStudent,
  isOpen, 
  onClose, 
  onEdit,
  onArchive
}: StudentDetailModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [studentData, setStudentData] = useState<StudentDetailsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isUnarchiveDialogOpen, setIsUnarchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  // Get user permissions
  const staffSubrole = (session?.user?.staffSubrole || 'TEACHER') as any
  const { canViewSection, isAdmin, isFinanceOfficer } = useStaffPermissions(
    session?.user ? {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      isSuperAdmin: session.user.isSuperAdmin
    } : undefined,
    staffSubrole
  )

  // Check if user has access to fees - admins, finance officers, and super admins can view
  // Also check role hints from session - ADMIN role should always see fees
  const userRole = session?.user?.roleHints
  const isOrgAdmin = userRole?.orgAdminOf && userRole.orgAdminOf.length > 0
  // Show fees for: super admins, org admins, staff with admin subrole, finance officers, or users with fees permission
  const canViewFees = session?.user?.isSuperAdmin || isOrgAdmin || isAdmin() || isFinanceOfficer() || canViewSection('fees')

  // Fetch student data
  useEffect(() => {
    const idToFetch = studentId || legacyStudent?.id
    if (isOpen && idToFetch) {
      // Set loading immediately for instant feedback
      setLoading(true)
      setStudentData(null)
      // Fetch data asynchronously
      fetchStudentDetails(idToFetch)
    } else if (isOpen) {
      setStudentData(null)
      setLoading(false)
    } else {
      // Reset when modal closes
      setStudentData(null)
      setLoading(false)
    }
  }, [isOpen, studentId, legacyStudent?.id])

  const fetchStudentDetails = async (id: string) => {
    if (!id) {
      setLoading(false)
      return
    }
    
    // Loading is already set to true in useEffect
    try {
      const response = await fetch(`/api/students/${id}/details`)
      if (response.ok) {
        const data = await response.json()
        // Ensure fees data exists
        if (!data.fees) {
          data.fees = {
            currentBalance: 0,
            totalPaidThisYear: 0,
            paymentRecords: [],
            invoices: []
          }
        }
        setStudentData(data)
      } else {
        toast.error('Failed to load student details')
      }
    } catch (error) {
      console.error('Failed to fetch student details', error)
      toast.error('Failed to load student details')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!studentData || !newNote.trim()) return

    setIsSavingNote(true)
    try {
      const response = await fetch(`/api/students/${studentData.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: newNote.trim()
        }),
      })

      if (response.ok) {
        toast.success('Note added successfully')
        setNewNote('')
        // Refresh student data
        await fetchStudentDetails(studentData.id)
      } else {
        toast.error('Failed to add note')
      }
    } catch (error) {
      console.error('Failed to add note', error)
      toast.error('Failed to add note')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleSendMessage = async (data: any) => {
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: data.title,
          body: data.message,
          audience: data.audience.toUpperCase(),
          channel: 'EMAIL',
          classIds: data.classId ? [data.classId] : undefined,
          parentId: data.parentId,
          saveOnly: false
        })
      })

      if (response.ok) {
        toast.success('Message sent successfully')
        setIsMessageModalOpen(false)
        setSelectedParentId(null)
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message', error)
      toast.error('Failed to send message')
    }
  }

  const handleConfirmArchive = async () => {
    if (!studentData || !onArchive) return
    
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/students/${studentData.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Failed to archive student'
        throw new Error(errorMessage)
      }

      onArchive(studentData.id, true)
      toast.success('Student archived successfully')
      setIsArchiveDialogOpen(false)
      // Refresh student data
      await fetchStudentDetails(studentData.id)
    } catch (error: any) {
      console.error('Archive error:', error)
      toast.error(error.message || 'Failed to archive student')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleConfirmUnarchive = async () => {
    if (!studentData || !onArchive) return
    
    setIsArchiving(true)
    try {
      const response = await fetch(`/api/students/${studentData.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isArchived: false
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || data.details || 'Failed to unarchive student'
        throw new Error(errorMessage)
      }

      onArchive(studentData.id, false)
      toast.success('Student unarchived successfully')
      setIsUnarchiveDialogOpen(false)
      // Refresh student data
      await fetchStudentDetails(studentData.id)
    } catch (error: any) {
      console.error('Unarchive error:', error)
      toast.error(error.message || 'Failed to unarchive student')
    } finally {
      setIsArchiving(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Don't render if not open
  if (!isOpen) return null

  // Show loading state
  if (loading || !studentData) {
    return (
      <div 
        className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
            <span className="text-sm text-[var(--muted-foreground)]">Loading student details...</span>
          </div>
        </div>
      </div>
    )
  }

  const attendanceRating = getAttendanceRating(studentData.attendance.overall)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'ABSENT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'LATE':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />Late</Badge>
      case 'OVERDUE':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Overdue</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-6xl my-8 max-h-[90vh] flex flex-col">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)] bg-[var(--muted)]/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--muted)]">
                      <User className="h-6 w-6 text-[var(--foreground)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-semibold text-[var(--foreground)] truncate">
                        {studentData.name}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-sm text-[var(--muted-foreground)]">Age {studentData.age}</span>
                        {studentData.classes.length > 0 && (
                          <>
                            <span className="text-sm text-[var(--muted-foreground)]">•</span>
                            <span className="text-sm text-[var(--muted-foreground)] truncate">
                              {studentData.classes.map(c => c.name).join(', ')}
                            </span>
                            {studentData.classes[0]?.teacher && (
                              <>
                                <span className="text-sm text-[var(--muted-foreground)]">•</span>
                                <span className="text-sm text-[var(--muted-foreground)] truncate">
                                  {studentData.classes[0].teacher.name}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        studentData.isArchived
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : studentData.status === 'ACTIVE'
                            ? 'bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]'
                            : 'bg-[#f5f5f5] text-[#374151] border border-[#e5e7eb]'
                      }
                    >
                      {studentData.isArchived ? 'ARCHIVED' : studentData.status}
                    </Badge>
                    <Badge variant="outline" className={`${attendanceRating.bgColor} ${attendanceRating.color} ${attendanceRating.borderColor} border`}>
                      {studentData.attendance.overall}% • {attendanceRating.text}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        onEdit(studentData.id)
                        onClose()
                      }}
                      className="hidden sm:flex"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {onArchive && (
                    <>
                      {!studentData.isArchived ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsArchiveDialogOpen(true)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Archive</span>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsUnarchiveDialogOpen(true)}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Unarchive</span>
                        </Button>
                      )}
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
                  >
                    <X className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content - Fully Tabbed Interface */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Mobile: Dropdown Select */}
                <div className="md:hidden">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a tab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Overview</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="parents">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span>Parents</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="attendance">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Attendance</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="fees">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>Fees</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="notes">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Notes</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="activity">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span>Activity</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Desktop: Tabs */}
                <TabsList className="hidden md:grid w-full grid-cols-6">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">
                    <User className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Overview</span>
                    <span className="sm:hidden">Info</span>
                  </TabsTrigger>
                  <TabsTrigger value="parents" className="text-xs sm:text-sm">
                    <UserCheck className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Parents</span>
                    <span className="sm:hidden">Parents</span>
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="text-xs sm:text-sm">
                    <Calendar className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Attendance</span>
                    <span className="sm:hidden">Att.</span>
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="text-xs sm:text-sm">
                    <DollarSign className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Fees</span>
                    <span className="sm:hidden">Fees</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs sm:text-sm">
                    <FileText className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Notes</span>
                    <span className="sm:hidden">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs sm:text-sm">
                    <Activity className="h-4 w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Activity</span>
                    <span className="sm:hidden">Act.</span>
                  </TabsTrigger>
                </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                          <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                          Student Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Date of Birth</label>
                            <p className="text-sm text-[var(--foreground)]">
                              {studentData.dateOfBirth ? formatDate(studentData.dateOfBirth) : 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Classes</label>
                            <div className="space-y-1">
                              {studentData.classes.length > 0 ? (
                                studentData.classes.map((cls, idx) => (
                                  <p key={idx} className="text-sm text-[var(--foreground)] flex items-center gap-2">
                                    <GraduationCap className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                    {cls.name}
                                    {cls.teacher && (
                                      <span className="text-xs text-[var(--muted-foreground)]">
                                        • {cls.teacher.name}
                                      </span>
                                    )}
                                  </p>
                                ))
                              ) : (
                                <p className="text-sm text-[var(--muted-foreground)]">Not enrolled in any classes</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Enrollment Date</label>
                            <p className="text-sm text-[var(--foreground)]">{formatDate(studentData.enrollmentDate)}</p>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--muted-foreground)]">Status</label>
                            <div className="text-sm text-[var(--foreground)]">
                              <Badge
                                variant="outline"
                                className={
                                  studentData.isArchived
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9]'
                                }
                              >
                                {studentData.isArchived ? 'ARCHIVED' : studentData.status}
                              </Badge>
                            </div>
                          </div>
                          {(studentData.allergies || studentData.medicalNotes) && (
                            <div className="pt-3 border-t border-[var(--border)]">
                              <label className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mb-2">
                                <Heart className="h-3.5 w-3.5" />
                                Medical Information
                              </label>
                              {studentData.allergies && (
                                <p className="text-sm text-[var(--foreground)] flex items-center gap-1 mb-1">
                                  {studentData.allergies !== 'None' ? (
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  )}
                                  <span>Allergies: {studentData.allergies}</span>
                                </p>
                              )}
                              {studentData.medicalNotes && (
                                <p className="text-sm text-[var(--foreground)]">{studentData.medicalNotes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Parents Tab */}
                    <TabsContent value="parents" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-[var(--muted-foreground)]" />
                          Parent/Guardian Information
                        </h3>
                        {studentData.parents.length > 0 ? (
                          <div className="space-y-4">
                            {studentData.parents.map((parent, idx) => (
                              <div key={parent.id || idx} className={idx > 0 ? 'pt-4 border-t border-[var(--border)]' : ''}>
                                <div className="flex items-center gap-2 mb-3">
                                  {parent.isPrimary && (
                                    <Badge variant="outline" className="text-xs">Primary</Badge>
                                  )}
                                  <h4 className="text-sm font-semibold text-[var(--foreground)]">{parent.name}</h4>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs text-[var(--muted-foreground)] mb-2 block">Contact Information</label>
                                    <div className="flex flex-wrap items-center gap-4">
                                      {parent.email && (
                                        <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                                          <Mail className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                          <a 
                                            href={`mailto:${parent.email}`}
                                            className="hover:underline truncate"
                                          >
                                            {parent.email}
                                          </a>
                                        </p>
                                      )}
                                      {parent.phone && (
                                        <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                                          <Phone className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                          {parent.phone}
                                        </p>
                                      )}
                                      {parent.backupPhone && (
                                        <p className="text-sm text-[var(--foreground)] flex items-center gap-2">
                                          <Phone className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                                          {parent.backupPhone} (Backup)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {parent.phone && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        asChild
                                      >
                                        <a href={`tel:${parent.phone}`}>
                                          <Phone className="h-4 w-4 mr-2" />
                                          Call
                                        </a>
                                      </Button>
                                    )}
                                    {parent.backupPhone && !parent.phone && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        asChild
                                      >
                                        <a href={`tel:${parent.backupPhone}`}>
                                          <Phone className="h-4 w-4 mr-2" />
                                          Call Backup
                                        </a>
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedParentId(parent.id)
                                        setIsMessageModalOpen(true)
                                      }}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Message
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                            No parent/guardian information available
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
                            <div className="text-xs text-[var(--muted-foreground)] mb-1">Present</div>
                            <div className="text-2xl font-bold text-green-600">{studentData.attendance.stats.present}</div>
                          </div>
                          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
                            <div className="text-xs text-[var(--muted-foreground)] mb-1">Absent</div>
                            <div className="text-2xl font-bold text-red-600">{studentData.attendance.stats.absent}</div>
                          </div>
                          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
                            <div className="text-xs text-[var(--muted-foreground)] mb-1">Late</div>
                            <div className="text-2xl font-bold text-yellow-600">{studentData.attendance.stats.late}</div>
                          </div>
                          <div className="p-3 bg-[var(--muted)]/50 rounded-lg">
                            <div className="text-xs text-[var(--muted-foreground)] mb-1">Total</div>
                            <div className="text-2xl font-bold text-[var(--foreground)]">{studentData.attendance.stats.total}</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Attendance</h4>
                          {studentData.attendance.recent.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {studentData.attendance.recent.map((att) => (
                                <div 
                                  key={att.id}
                                  className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--card)] hover:bg-[var(--accent)] transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {getStatusIcon(att.status)}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-[var(--foreground)]">
                                        {formatDate(att.date)}
                                      </div>
                                      {att.class && (
                                        <div className="text-xs text-[var(--muted-foreground)]">{att.class.name}</div>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className={`${getStatusColor(att.status)} justify-center text-xs px-2 py-0.5`}>
                                    {att.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                              No attendance records yet
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Fees Tab */}
                    <TabsContent value="fees" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        {canViewFees ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                              <div className="p-4 bg-[var(--muted)]/50 rounded-lg">
                                <div className="text-xs text-[var(--muted-foreground)] mb-1">Outstanding Balance</div>
                                <div className={`text-2xl font-bold ${studentData.fees.currentBalance > 0 ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
                                  £{studentData.fees.currentBalance.toFixed(2)}
                                </div>
                                {studentData.fees.currentBalance > 0 && (
                                  <div className="text-xs text-[var(--muted-foreground)] mt-1">Amount owed</div>
                                )}
                              </div>
                              <div className="p-4 bg-[var(--muted)]/50 rounded-lg">
                                <div className="text-xs text-[var(--muted-foreground)] mb-1">Total Paid This Year</div>
                                <div className="text-2xl font-bold text-green-600">
                                  £{studentData.fees.totalPaidThisYear.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Payment History</h4>
                              {studentData.fees.paymentRecords && studentData.fees.paymentRecords.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {studentData.fees.paymentRecords.slice(0, 10).map((record) => {
                                        const paymentMethod = record.method === 'STRIPE' ? 'Card' : 
                                                             record.method === 'BANK_TRANSFER' ? 'Bank Transfer' :
                                                             record.method === 'CASH' ? 'Cash' :
                                                             record.method || 'Not specified'
                                        const date = record.paidAt 
                                          ? new Date(record.paidAt).toLocaleDateString()
                                          : record.createdAt 
                                          ? new Date(record.createdAt).toLocaleDateString()
                                          : record.month
                                        return (
                                          <TableRow key={record.id}>
                                            <TableCell className="font-medium">{date}</TableCell>
                                            <TableCell>{record.class?.name || 'N/A'}</TableCell>
                                            <TableCell className="font-medium">£{(record.amountP / 100).toFixed(2)}</TableCell>
                                            <TableCell>{paymentMethod}</TableCell>
                                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                                  <p className="text-muted-foreground">No payment records yet</p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                            You don't have permission to view payment details
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    {/* Notes Tab */}
                    <TabsContent value="notes" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Add Note</h4>
                          <div className="space-y-2">
                            <Textarea
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Enter a note about this student..."
                              className="min-h-[100px]"
                            />
                            <Button
                              onClick={handleAddNote}
                              disabled={!newNote.trim() || isSavingNote}
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              {isSavingNote ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Save Note
                            </Button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Notes History</h4>
                          {studentData.notes.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {studentData.notes.map((note) => (
                                <div 
                                  key={note.id}
                                  className="p-3 border border-[var(--border)] rounded-lg bg-[var(--card)]"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="text-xs text-[var(--muted-foreground)]">
                                      {note.author?.name || 'Unknown'} • {formatDate(note.createdAt)}
                                    </div>
                                  </div>
                                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{note.body}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                              No notes yet
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Activity Tab */}
                    <TabsContent value="activity" className="mt-4">
                      <div className="border border-[var(--border)] rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Activity</h4>
                        {studentData.activity.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {studentData.activity.map((log) => (
                              <div 
                                key={log.id}
                                className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg bg-[var(--card)]"
                              >
                                <Activity className="h-4 w-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-[var(--foreground)]">
                                    <span className="font-medium">{log.action}</span>
                                    {log.actor && (
                                      <span className="text-[var(--muted-foreground)]"> by {log.actor.name}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                                    {formatDate(log.createdAt)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                            No activity logged
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-6 border-t border-[var(--border)] bg-[var(--muted)]/30 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(studentData.id)
                      onClose()
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Student
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Student"
        message={`Are you sure you want to archive ${studentData?.name}? This will disable their account and remove them from active students.`}
        confirmText="Archive Student"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isArchiving}
      />

      {/* Unarchive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isUnarchiveDialogOpen}
        onClose={() => setIsUnarchiveDialogOpen(false)}
        onConfirm={handleConfirmUnarchive}
        title="Unarchive Student"
        message={`Are you sure you want to unarchive ${studentData?.name}? This will restore their account and make them active again.`}
        confirmText="Unarchive Student"
        cancelText="Cancel"
        variant="default"
        isLoading={isArchiving}
      />

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false)
          setSelectedParentId(null)
        }}
        onSend={handleSendMessage}
        initialParentId={selectedParentId}
      />
    </>
  )
}

