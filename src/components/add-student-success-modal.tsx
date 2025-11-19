'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, X as CloseIcon } from 'lucide-react'

interface AddStudentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onSendInvite: () => void
  studentName: string
  parentEmail: string
}

export function AddStudentSuccessModal({ 
  isOpen, 
  onClose, 
  onSendInvite, 
  studentName, 
  parentEmail 
}: AddStudentSuccessModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Added Successfully"
    >
      <div className="space-y-6">
        {/* Success Icon and Message */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Student Added Successfully!
          </h3>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{studentName}</span> has been added to the system.
          </p>
        </div>

        {/* Student Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student Name:</span>
                <span className="font-medium">{studentName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Parent Email:</span>
                <span className="font-medium text-blue-600">{parentEmail}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={onSendInvite}
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Invite Email to Parent
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            <CloseIcon className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            The parent will receive an email invitation to create an account and access their child's information.
          </p>
        </div>
      </div>
    </Modal>
  )
}
