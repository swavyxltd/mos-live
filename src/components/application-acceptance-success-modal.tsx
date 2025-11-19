'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, X as CloseIcon, Users, BookOpen } from 'lucide-react'

interface Student {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: string
  parentName: string
  parentEmail: string
  parentPhone: string
  status: string
  preferredClass?: string
}

interface ApplicationAcceptanceSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onSendInvite: () => void
  students: Student[]
  parentEmail: string
  parentName: string
}

export function ApplicationAcceptanceSuccessModal({ 
  isOpen, 
  onClose, 
  onSendInvite, 
  students,
  parentEmail,
  parentName
}: ApplicationAcceptanceSuccessModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const handleNext = () => {
    setCurrentStep(2)
  }

  const handleSendInviteAndClose = () => {
    onSendInvite()
    onClose()
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentStep === 1 ? "Application Accepted Successfully" : "Send Sign-up Email"}
      className="max-h-[90vh] overflow-hidden"
    >
      <div className="space-y-4">
        {currentStep === 1 ? (
          <>
            {/* Success Icon and Message */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Application Accepted!
              </h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{students.length} student{students.length > 1 ? 's' : ''}</span> have been added to the system.
              </p>
            </div>

            {/* Students Info Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {students.map((student, index) => (
                    <div key={student.id} className="rounded-lg p-2 bg-gray-50 shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>DOB: {student.dateOfBirth.toLocaleDateString()}</div>
                        <div>Gender: {student.gender}</div>
                        {student.preferredClass && (
                          <div className="flex items-center text-blue-600">
                            <BookOpen className="h-3 w-3 mr-1" />
                            Class: {student.preferredClass}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>


            {/* Next Button */}
            <div className="flex justify-end">
              <Button onClick={handleNext} className="px-6">
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Email Confirmation Step */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-3">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Send Sign-up Email?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to send a sign-up email to <span className="font-medium">{parentName}</span> at <span className="font-medium text-blue-600">{parentEmail}</span>?
              </p>
            </div>

            {/* Parent Info Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Parent Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Parent Name:</span>
                    <span className="font-medium">{parentName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium text-blue-600">{parentEmail}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Students:</span>
                    <span className="font-medium">{students.length} child{students.length > 1 ? 'ren' : ''}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                onClick={handleSendInviteAndClose}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Sign-up Email
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="w-full"
              >
                <CloseIcon className="h-4 w-4 mr-2" />
                Skip Email
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                The parent will receive an email invitation to create an account and access their children's information.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
