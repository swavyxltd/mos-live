'use client'

import { useState, useCallback } from 'react'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, XCircle, Copy, ExternalLink } from 'lucide-react'
import { OnboardingPageClient } from '@/components/onboarding-page-client'
import { OnboardingStudentModal } from '@/components/onboarding-student-modal'
import { CopySignupLinkModal } from '@/components/copy-signup-link-modal'

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

interface Class {
  id: string
  name: string
}

interface OnboardingPageWrapperProps {
  initialStudents: Student[]
  classes: Class[]
  stats: {
    total: number
    notSignedUp: number
    signedUpVerified: number
  }
  orgSlug: string
}

export function OnboardingPageWrapper({ initialStudents, classes, stats, orgSlug }: OnboardingPageWrapperProps) {
  const [students] = useState<Student[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false)

  const handleRowClick = useCallback((student: Student) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedStudent(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Student Onboarding</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Track which students have parents who have signed up for accounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCopyLinkModal(true)}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            <span className="sm:hidden">Copy Link</span>
            <span className="hidden sm:inline">Copy Signup Link</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/parent/signup?org=${orgSlug}`, '_blank')}
            className="w-full sm:w-auto"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            <span className="sm:hidden">View Form</span>
            <span className="hidden sm:inline">View Signup Link</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Students"
          value={stats.total}
          icon={<Users className="h-4 w-4 text-gray-600" />}
          className="border-l-4 border-l-gray-500 bg-gray-50/30"
        />
        
        <StatCard
          title="Signed Up & Verified"
          value={stats.signedUpVerified}
          description="Parents verified"
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          className="border-l-4 border-l-green-500 bg-green-50/30"
        />
        
        <StatCard
          title="Not Signed Up"
          value={stats.notSignedUp}
          description="No parent account"
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          className="border-l-4 border-l-red-500 bg-red-50/30"
        />
      </div>

      {/* Filters and Students List */}
      <OnboardingPageClient 
        students={students}
        classes={classes}
        onRowClick={handleRowClick}
      />
      
      {/* Student Details Modal */}
      {selectedStudent && (
        <OnboardingStudentModal
          student={selectedStudent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {/* Copy Signup Link Modal */}
      {showCopyLinkModal && (
        <CopySignupLinkModal
          orgSlug={orgSlug}
          onClose={() => setShowCopyLinkModal(false)}
        />
      )}
    </div>
  )
}

