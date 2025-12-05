'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ParentEditStudentModal } from '@/components/parent-edit-student-modal'
import { 
  Users, 
  Edit, 
  Calendar,
  Phone,
  AlertTriangle,
  BookOpen,
  Clock,
  CreditCard,
  TrendingUp,
  Eye,
  X,
  GraduationCap,
  Heart,
  MapPin
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { getAttendanceRating } from '@/lib/attendance-ratings'

interface Student {
  id: string
  firstName: string
  lastName: string
  name: string
  dateOfBirth: string
  age: number
  grade: string
  address: string
  class: string
  teacher: string
  parentName: string
  parentEmail: string
  parentPhone: string
  emergencyContact: string
  allergies: string
  medicalNotes: string
  enrollmentDate: string
  status: string
  isArchived: boolean
  classes: Array<{ id: string; name: string; teacher: string }>
  attendanceRate: number
  totalAttendanceDays: number
  presentDays: number
  totalOutstanding: number
  hasOverdue: boolean
}

interface ParentChildrenPageClientProps {
  students: Student[]
}

export function ParentChildrenPageClient({ students: initialStudents }: ParentChildrenPageClientProps) {
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  const fetchPaymentHistory = async () => {
    try {
      setLoadingPayments(true)
      const response = await fetch('/api/parent/payments/history')
      if (response.ok) {
        const data = await response.json()
        setPaymentHistory(data.payments || [])
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
    } finally {
      setLoadingPayments(false)
    }
  }
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)

  useEffect(() => {
    const handleRefresh = async () => {
      window.location.reload()
    }

    const handleStudentDataRefresh = (event: CustomEvent) => {
      if (event.detail && selectedStudent?.id === event.detail.id) {
        setSelectedStudent(event.detail)
        setStudents(prev => prev.map(s => s.id === event.detail.id ? event.detail : s))
      }
    }

    window.addEventListener('refresh-student-list', handleRefresh)
    window.addEventListener('refresh-student-data', handleStudentDataRefresh as EventListener)

    return () => {
      window.removeEventListener('refresh-student-list', handleRefresh)
      window.removeEventListener('refresh-student-data', handleStudentDataRefresh as EventListener)
    }
  }, [selectedStudent])

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student)
    setIsEditModalOpen(true)
  }

  const handleEditSave = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s))
    setSelectedStudent(updatedStudent)
    setIsEditModalOpen(false)
  }

  const handleEditClose = () => {
    setIsEditModalOpen(false)
    setSelectedStudent(null)
  }

  const handleViewStudent = (student: Student) => {
    setViewingStudent(student)
  }

  const handleCloseView = () => {
    setViewingStudent(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">My Children</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          View and manage your children's information
        </p>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No Children Enrolled</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            You don't have any children enrolled yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => {
            const attendanceRating = student.totalAttendanceDays > 0 
              ? getAttendanceRating(student.attendanceRate)
              : null
            
            return (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-[var(--foreground)] mb-1">
                        {student.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        {student.grade && student.grade !== 'N/A' && (
                          <span>Grade {student.grade}</span>
                        )}
                        {student.age > 0 && (
                          <span>• Age {student.age}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {student.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Simple Overview */}
                  <div className="space-y-2">
                    {student.classes && student.classes.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-[var(--foreground)]">
                          {student.classes.length} {student.classes.length === 1 ? 'class' : 'classes'}
                        </span>
                      </div>
                    )}
                    {student.totalAttendanceDays > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-[var(--foreground)]">
                          {student.attendanceRate}% attendance
                        </span>
                      </div>
                    )}
                    {student.totalOutstanding > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className={student.hasOverdue ? "text-red-600" : "text-[var(--foreground)]"}>
                          £{student.totalOutstanding} {student.hasOverdue ? 'overdue' : 'due'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewStudent(student)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStudent(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* View Modal */}
      {viewingStudent && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseView()
            }
          }}
        >
          <div className="w-[95vw] sm:w-[90vw] md:max-w-3xl my-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">
                      {viewingStudent.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      {viewingStudent.grade && viewingStudent.grade !== 'N/A' && (
                        <span>Grade {viewingStudent.grade}</span>
                      )}
                      {viewingStudent.age > 0 && (
                        <span>• Age {viewingStudent.age}</span>
                      )}
                      {viewingStudent.dateOfBirth && (
                        <span>• Born {formatDate(viewingStudent.dateOfBirth)}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseView}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-[var(--border)]">
                  <Link href={`/parent/attendance?student=${viewingStudent.id}`}>
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-2" />
                      View Attendance
                    </Button>
                  </Link>
                  <Link href={`/parent/calendar?student=${viewingStudent.id}`}>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Calendar
                    </Button>
                  </Link>
                  <Link href="/parent/payments">
                    <Button variant="outline" size="sm">
                      <CreditCard className="h-4 w-4 mr-2" />
                      View Payments
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      handleCloseView()
                      handleEditStudent(viewingStudent)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                </div>

                {/* Classes */}
                {viewingStudent.classes && viewingStudent.classes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-5 w-5 text-[var(--muted-foreground)]" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                        Classes
                      </h3>
                    </div>
                    <div>
                      {viewingStudent.classes.map((cls, index) => (
                        <div key={cls.id}>
                          <div className="p-3">
                            <div className="font-medium text-[var(--foreground)]">{cls.name}</div>
                            <div className="text-sm text-[var(--muted-foreground)] mt-1">
                              Teacher: {cls.teacher}
                            </div>
                          </div>
                          {index < viewingStudent.classes.length - 1 && (
                            <div className="border-b border-[var(--border)]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendance */}
                {viewingStudent.totalAttendanceDays > 0 && (() => {
                  const viewingAttendanceRating = getAttendanceRating(viewingStudent.attendanceRate)
                  const ViewingTrendIcon = viewingAttendanceRating.icon as React.ComponentType<{ className?: string }>
                  
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-[var(--muted-foreground)]" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                          Attendance
                        </h3>
                      </div>
                      <div className="p-4 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--accent)]/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl font-bold text-[var(--foreground)]">
                            {viewingStudent.attendanceRate}%
                          </span>
                          <ViewingTrendIcon className={`h-5 w-5 ${viewingAttendanceRating.color}`} />
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)] mb-1">
                          {viewingStudent.presentDays} of {viewingStudent.totalAttendanceDays} days present
                        </div>
                        <div className={`text-sm ${viewingAttendanceRating.color}`}>
                          {viewingAttendanceRating.text}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Payment History */}
                {paymentHistory.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-5 w-5 text-[var(--muted-foreground)]" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                        Recent Payments
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="p-3 border border-[var(--border)] rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <div className="font-medium text-[var(--foreground)]">
                                {payment.studentName} - {payment.className}
                              </div>
                              <div className="text-sm text-[var(--muted-foreground)]">
                                {payment.month}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-[var(--foreground)]">
                                £{(payment.amount / 100).toFixed(2)}
                              </div>
                              <Badge 
                                variant={payment.status === 'PAID' ? 'default' : payment.status === 'FAILED' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                          {payment.paidAt && (
                            <div className="text-xs text-[var(--muted-foreground)] mt-1">
                              Paid: {formatDate(payment.paidAt)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medical Information */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-5 w-5 text-[var(--muted-foreground)]" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wide">
                      Medical Information
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                      <div className="text-sm font-medium text-[var(--foreground)] mb-1">Allergies</div>
                      <div className="text-sm text-[var(--muted-foreground)]">
                        {viewingStudent.allergies && viewingStudent.allergies !== 'None' ? (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span>{viewingStudent.allergies}</span>
                          </div>
                        ) : (
                          'No known allergies'
                        )}
                      </div>
                    </div>
                    {viewingStudent.medicalNotes && (
                      <div className="p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                        <div className="text-sm font-medium text-[var(--foreground)] mb-1">Medical Notes</div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          {viewingStudent.medicalNotes}
                        </div>
                      </div>
                    )}
                    {viewingStudent.emergencyContact && (
                      <div className="p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                        <div className="text-sm font-medium text-[var(--foreground)] mb-1">Emergency Contact</div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                          <Phone className="h-4 w-4" />
                          <span>{viewingStudent.emergencyContact}</span>
                        </div>
                      </div>
                    )}
                    {viewingStudent.address && (
                      <div className="p-3 border border-[var(--border)] rounded-[var(--radius-md)]">
                        <div className="text-sm font-medium text-[var(--foreground)] mb-1">Address</div>
                        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                          <MapPin className="h-4 w-4" />
                          <span>{viewingStudent.address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Status */}
                {viewingStudent.totalOutstanding > 0 && (
                  <div className="p-4 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--accent)]/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[var(--foreground)] mb-1">
                          {viewingStudent.hasOverdue ? 'Payment Overdue' : 'Payment Due'}
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          Outstanding amount: £{viewingStudent.totalOutstanding}
                        </div>
                      </div>
                      <Link href="/parent/payments">
                        <Button variant={viewingStudent.hasOverdue ? "destructive" : "default"} size="sm">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedStudent && (
        <ParentEditStudentModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          onSave={handleEditSave}
          student={selectedStudent}
        />
      )}
    </div>
  )
}
