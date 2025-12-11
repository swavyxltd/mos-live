'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { EditClassModal } from '@/components/edit-class-modal'
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Clock, 
  User,
  Mail,
  Edit,
  Trash2,
  Loader2,
  X,
  GraduationCap,
  DollarSign,
  ExternalLink,
  Phone,
  MapPin
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface ClassDetailModalProps {
  classId: string | null
  isOpen: boolean
  onClose: () => void
  onClassUpdate?: () => void
}

interface ClassData {
  id: string
  name: string
  description: string | null
  schedule: any
  teacher: {
    id?: string
    name: string
    email: string
  } | null
  studentClasses: Array<{
    student: {
      id?: string
      firstName: string
      lastName: string
    }
    enrolledAt: Date | string
  }>
  _count: {
    studentClasses: number
  }
  monthlyFeeP?: number
}

export function ClassDetailModal({ classId, isOpen, onClose, onClassUpdate }: ClassDetailModalProps) {
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [orgFeeDueDay, setOrgFeeDueDay] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (isOpen && classId) {
      fetchClassDetails()
    } else {
      setClassData(null)
    }
  }, [isOpen, classId])

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

  const fetchClassDetails = async () => {
    if (!classId) return
    
    setLoading(true)
    try {
      // Fetch class data and org settings in parallel
      const [classResponse, orgResponse] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch('/api/settings/organisation')
      ])
      
      if (classResponse.ok) {
        const data = await classResponse.json()
        
        // Parse schedule
        let parsedSchedule: any = {}
        if (data.schedule) {
          try {
            parsedSchedule = typeof data.schedule === 'string' 
              ? JSON.parse(data.schedule) 
              : data.schedule
          } catch (e) {
            parsedSchedule = {}
          }
        }

        // Get org feeDueDay
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          setOrgFeeDueDay(orgData.feeDueDay || 1)
        }

        // Transform to match expected format
        const transformed: ClassData = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          schedule: parsedSchedule,
          teacher: data.User ? {
            id: data.User.id,
            name: data.User.name || '',
            email: data.User.email || ''
          } : null,
          studentClasses: (data.StudentClass || []).map((sc: any) => ({
            student: {
              id: sc.Student?.id,
              firstName: sc.Student?.firstName || '',
              lastName: sc.Student?.lastName || ''
            },
            enrolledAt: sc.Student?.createdAt ? new Date(sc.Student.createdAt) : new Date()
          })),
          _count: {
            studentClasses: data._count?.StudentClass || 0
          },
          monthlyFeeP: data.monthlyFeeP
        }
        
        setClassData(transformed)
      } else {
        toast.error('Failed to load class details')
      }
    } catch (error) {
      console.error('Failed to fetch class details', error)
      toast.error('Failed to load class details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!classData) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/classes/${classData.id}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'archive' })
      })
      
      if (response.ok) {
        toast.success('Class archived successfully')
        setIsDeleteDialogOpen(false)
        onClose()
        if (onClassUpdate) {
          onClassUpdate()
        } else {
          router.refresh()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to archive class')
      }
    } catch (error) {
      console.error('Failed to archive class', error)
      toast.error('Failed to archive class')
    } finally {
      setIsDeleting(false)
    }
  }

  const schedule = classData?.schedule || {}
  const days = schedule?.days || []
  const startTime = schedule?.startTime || 'TBD'
  const endTime = schedule?.endTime || 'TBD'

  const formatDays = (days: string[]) => {
    if (days.length === 0) return 'Not scheduled'
    if (days.length === 5 && days.includes('Monday') && days.includes('Friday')) {
      return 'Mon - Fri'
    }
    return days.join(', ')
  }

  if (!isOpen) return null

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
        <div className="w-[95vw] sm:w-[90vw] md:w-[75vw] my-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--muted)]">
                      <BookOpen className="h-5 w-5 text-[var(--foreground)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                        {classData?.name || 'Class Details'}
                      </h2>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {classData?.teacher?.name ? `${classData.teacher.name} • ` : ''}
                        {classData?._count?.studentClasses || 0} {classData?._count?.studentClasses === 1 ? 'student' : 'students'}
                      </p>
                    </div>
                  </div>
                  {classData && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          classData._count.studentClasses > 0
                            ? 'bg-green-100 text-green-800 border-0'
                            : 'bg-[#f5f5f5] text-[#374151] border border-[#e5e7eb]'
                        }
                      >
                        {classData._count.studentClasses > 0 ? 'ACTIVE' : 'EMPTY'}
                      </Badge>
                      {classData.monthlyFeeP && (
                        <Badge variant="outline" className="text-xs">
                          £{(classData.monthlyFeeP / 100).toFixed(2)}/mo
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {classData && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hidden sm:flex"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="hidden sm:flex"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
                </div>
              ) : !classData ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                  <p className="text-[var(--muted-foreground)]">Failed to load class details</p>
                </div>
              ) : (
                <>
                  {/* Class Information */}
                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <BookOpen className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Class Information</h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm text-[var(--muted-foreground)]">Class Name</label>
                              <p className="text-sm font-medium text-[var(--foreground)] mt-1">{classData.name}</p>
                            </div>
                            {classData.description && (
                              <div className="sm:col-span-2">
                                <label className="text-sm text-[var(--muted-foreground)]">Description</label>
                                <p className="text-sm text-[var(--foreground)] mt-1">{classData.description}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 border-t border-[var(--border)]">
                            <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                              <Calendar className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                              <span className="truncate">{formatDays(days) || 'Not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                              <Clock className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                              <span>{startTime !== 'TBD' && endTime !== 'TBD' ? `${startTime} - ${endTime}` : 'TBD'}</span>
                            </div>
                            {classData.monthlyFeeP && (
                              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                                <DollarSign className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                                <span>£{(classData.monthlyFeeP / 100).toFixed(2)}/month</span>
                              </div>
                            )}
                            {orgFeeDueDay && (
                              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                                <Calendar className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                                <span>Due {orgFeeDueDay}{orgFeeDueDay === 1 ? 'st' : orgFeeDueDay === 2 ? 'nd' : orgFeeDueDay === 3 ? 'rd' : 'th'} of month</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Students */}
                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <Users className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            Enrolled Students ({classData._count.studentClasses})
                          </h3>
                          {classData.studentClasses.length > 0 && (
                            <Link href={`/students?class=${classData.id}`}>
                              <Button variant="ghost" size="sm" className="text-sm">
                                View All
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                        {classData.studentClasses.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead className="hidden sm:table-cell">Enrolled Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classData.studentClasses
                                  .sort((a, b) => {
                                    const firstNameCompare = (a.student.firstName || '').localeCompare(b.student.firstName || '', undefined, { sensitivity: 'base' })
                                    if (firstNameCompare !== 0) return firstNameCompare
                                    return (a.student.lastName || '').localeCompare(b.student.lastName || '', undefined, { sensitivity: 'base' })
                                  })
                                  .slice(0, 10)
                                  .map((enrollment, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                          <span>{enrollment.student.firstName} {enrollment.student.lastName}</span>
                                          <span className="text-sm text-[var(--muted-foreground)] sm:hidden">
                                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell">
                                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                            {classData.studentClasses.length > 10 && (
                              <div className="text-center py-3 border-t border-[var(--border)]">
                                <p className="text-sm text-[var(--muted-foreground)]">
                                  Showing 10 of {classData.studentClasses.length} students
                                </p>
                                <Link href={`/students?class=${classData.id}`}>
                                  <Button variant="ghost" size="sm" className="mt-2">
                                    View All Students
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 sm:py-8">
                            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--muted-foreground)] mx-auto mb-3 sm:mb-4" />
                            <h3 className="text-base sm:text-lg font-medium text-[var(--foreground)] mb-2">No students enrolled</h3>
                            <p className="text-sm sm:text-base text-[var(--muted-foreground)] mb-4">Students will appear here once they're enrolled in this class.</p>
                            <Link href="/students">
                              <Button variant="outline" size="sm">
                                Enroll Students
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Teacher Information */}
                  <div className="border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Assigned Teacher</h3>
                        {classData.teacher ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm text-[var(--muted-foreground)]">Name</label>
                                <p className="text-sm font-medium text-[var(--foreground)] mt-1">{classData.teacher.name}</p>
                              </div>
                              <div>
                                <label className="text-sm text-[var(--muted-foreground)]">Email</label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                                  <a 
                                    href={`mailto:${classData.teacher.email}`}
                                    className="text-sm text-[var(--foreground)] truncate hover:underline"
                                  >
                                    {classData.teacher.email}
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-[var(--border)]">
                              <Link href={`/messages?classId=${classData.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Email
                                </Button>
                              </Link>
                              {classData.teacher.id && (
                                <Link href={`/staff/${classData.teacher.id}`} className="flex-1">
                                  <Button variant="outline" size="sm" className="w-full">
                                    <User className="h-4 w-4 mr-2" />
                                    View Profile
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <User className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--muted-foreground)] mb-3">No teacher assigned to this class</p>
                            <Link href={`/classes/${classData.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Assign Teacher
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Class
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Archive Class
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Class Modal */}
      <EditClassModal
        classId={classId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={() => {
          setIsEditModalOpen(false)
          fetchClassDetails()
          if (onClassUpdate) {
            onClassUpdate()
          } else {
            router.refresh()
          }
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Archive Class"
        message={`Are you sure you want to archive "${classData?.name}"? This will hide the class from active classes, but it can be restored later.`}
        confirmText="Archive Class"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  )
}
