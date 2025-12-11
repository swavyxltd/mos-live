'use client'

import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  XCircle,
  Mail,
  Phone,
  Calendar,
  User,
  GraduationCap
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Student {
  id: string
  firstName: string
  lastName: string
  dob: Date | null
  classes: Array<{
    id: string
    name: string
  }>
  signupStatus: 'not_signed_up' | 'signed_up_verified'
  parentInfo: {
    id: string
    name: string
    email: string
    phone: string | null
    emailVerified: boolean
    linkedAt: Date | null
  } | null
  claimStatus: string
  createdAt: Date
}

interface OnboardingStudentModalProps {
  student: Student
  isOpen: boolean
  onClose: () => void
}

export function OnboardingStudentModal({ student, isOpen, onClose }: OnboardingStudentModalProps) {
  const getStatusBadge = (status: Student['signupStatus']) => {
    switch (status) {
      case 'signed_up_verified':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed Up
          </Badge>
        )
      case 'not_signed_up':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Not Signed Up
          </Badge>
        )
    }
  }

  const calculateAge = (dob: Date | null): number | null => {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${student.firstName} ${student.lastName}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <User className="h-4 w-4" />
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Full Name</label>
                <p className="text-sm text-[var(--foreground)] mt-1">
                  {student.firstName} {student.lastName}
                </p>
              </div>
              {student.dob && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Date of Birth
                    </label>
                    <p className="text-sm text-[var(--foreground)] mt-1">
                      {formatDate(student.dob)}
                    </p>
                  </div>
                  {calculateAge(student.dob) !== null && (
                    <div>
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">Age</label>
                      <p className="text-sm text-[var(--foreground)] mt-1">
                        {calculateAge(student.dob)} years old
                      </p>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Enrolled</label>
                <p className="text-sm text-[var(--foreground)] mt-1">
                  {formatDate(student.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Classes */}
          {student.classes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Classes
              </h3>
              <div className="flex flex-wrap gap-2">
                {student.classes.map(cls => (
                  <Badge key={cls.id} variant="outline">
                    {cls.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Signup Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Signup Status</h3>
            <div>
              {getStatusBadge(student.signupStatus)}
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Claim Status</label>
              <p className="text-sm text-[var(--foreground)] mt-1 capitalize">
                {student.claimStatus.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>

          {/* Parent Information */}
          {student.parentInfo ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Parent Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">Parent Name</label>
                  <p className="text-sm text-[var(--foreground)] mt-1">
                    {student.parentInfo.name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <p className="text-sm text-[var(--foreground)] mt-1">
                    {student.parentInfo.email}
                  </p>
                </div>
                {student.parentInfo.phone && (
                  <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </label>
                    <p className="text-sm text-[var(--foreground)] mt-1">
                      {student.parentInfo.phone}
                    </p>
                  </div>
                )}
                {student.parentInfo.linkedAt && (
                  <div>
                    <label className="text-xs font-medium text-[var(--muted-foreground)]">Linked At</label>
                    <p className="text-sm text-[var(--foreground)] mt-1">
                      {formatDate(student.parentInfo.linkedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Parent Account</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                No parent account linked to this student yet.
              </p>
            </div>
          )}
        </div>
    </Modal>
  )
}

