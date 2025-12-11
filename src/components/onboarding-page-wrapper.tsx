'use client'

import { useState, useCallback } from 'react'
import { StatCard } from '@/components/ui/stat-card'
import { Users, CheckCircle, XCircle } from 'lucide-react'
import { OnboardingPageClient } from '@/components/onboarding-page-client'
import { OnboardingStudentModal } from '@/components/onboarding-student-modal'

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
}

export function OnboardingPageWrapper({ initialStudents, classes, stats }: OnboardingPageWrapperProps) {
  const [students] = useState<Student[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Students"
          value={stats.total}
          icon={<Users className="h-4 w-4 text-blue-600" />}
          className="border-l-4 border-l-blue-500 bg-blue-50/30"
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
    </div>
  )
}

