'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  FileText
} from 'lucide-react'
import { ApplicationAcceptanceSuccessModal } from './application-acceptance-success-modal'
import { PhoneLink } from './phone-link'

interface Application {
  id: string
  status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  guardianAddress?: string
  submittedAt: string
  children: Array<{
    firstName: string
    lastName: string
    dob?: string
    gender?: string
  }>
  preferredClass?: string
  preferredTerm?: string
  preferredStartDate?: string
  additionalNotes?: string
  adminNotes?: string
}

interface ApplicationDetailModalProps {
  application: Application
  onClose: () => void
  onStatusUpdate: (applicationId: string, newStatus: string, adminNotes?: string) => void
}

export function ApplicationDetailModal({ 
  application, 
  onClose, 
  onStatusUpdate 
}: ApplicationDetailModalProps) {
  const [status, setStatus] = useState(application.status)
  const [adminNotes, setAdminNotes] = useState(application.adminNotes || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [acceptedStudents, setAcceptedStudents] = useState<any[]>([])

  const handleSendInvite = async () => {
    // TODO: Implement email sending logic
    setShowSuccessModal(false)
    onClose()
  }

  const handleStatusUpdate = async () => {
    setIsUpdating(true)
    try {
      await onStatusUpdate(application.id, status, adminNotes)
      
      // If status is ACCEPTED, trigger dashboard refresh and show success modal
      if (status === 'ACCEPTED') {
        // Trigger dashboard refresh events
        window.dispatchEvent(new CustomEvent('refresh-dashboard'))
        if (window.location.pathname.startsWith('/owner/')) {
          window.dispatchEvent(new CustomEvent('refresh-owner-dashboard'))
        }
        
        // Create student records from application children
        const students = application.children.map((child, index) => ({
          id: `student-${application.id}-${index}`,
          firstName: child.firstName,
          lastName: child.lastName,
          dateOfBirth: child.dob ? new Date(child.dob) : new Date(),
          gender: child.gender || 'Not specified',
          parentName: application.guardianName,
          parentEmail: application.guardianEmail,
          parentPhone: application.guardianPhone,
          status: 'ACTIVE',
          preferredClass: application.preferredClass
        }))
        
        setAcceptedStudents(students)
        setShowSuccessModal(true)
      } else {
        // For other statuses, just close the modal
        onClose()
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />New</Badge>
      case 'REVIEWED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>
      case 'ACCEPTED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
      case 'REJECTED':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
              <p className="text-sm text-gray-500">
                Submitted on {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusBadge(application.status)}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guardian Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Guardian Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{application.guardianName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <p className="text-gray-900">
                    <PhoneLink phone={application.guardianPhone} />
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </label>
                  <p className="text-gray-900">{application.guardianEmail}</p>
                </div>
                {application.guardianAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Address
                    </label>
                    <p className="text-gray-900">{application.guardianAddress}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Children Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Children ({application.children.length})
              </h3>
              <div className="space-y-3">
                {application.children.map((child, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {child.firstName} {child.lastName}
                        </p>
                        {child.dob && (
                          <p className="text-sm text-gray-600">
                            DOB: {new Date(child.dob).toLocaleDateString()}
                          </p>
                        )}
                        {child.gender && (
                          <p className="text-sm text-gray-600">
                            Gender: {child.gender}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Preferences */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Preferences
              </h3>
              <div className="space-y-4">
                {application.preferredClass && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Class</label>
                    <p className="text-gray-900">{application.preferredClass}</p>
                  </div>
                )}
                {application.preferredTerm && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Term</label>
                    <p className="text-gray-900">{application.preferredTerm}</p>
                  </div>
                )}
                {application.preferredStartDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preferred Start Date</label>
                    <p className="text-gray-900">
                      {new Date(application.preferredStartDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Notes
              </h3>
              <div className="space-y-4">
                {application.additionalNotes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Additional Notes from Guardian</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                      {application.additionalNotes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Admin Actions */}
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Update Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={status === 'NEW' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('NEW')}
                    className={`${
                      status === 'NEW' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    New
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'REVIEWED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('REVIEWED')}
                    className={`${
                      status === 'REVIEWED' 
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                        : 'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                    }`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Reviewed
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'ACCEPTED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('ACCEPTED')}
                    className={`${
                      status === 'ACCEPTED' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accepted
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'REJECTED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('REJECTED')}
                    className={`${
                      status === 'REJECTED' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejected
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Admin Notes
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Application Acceptance Success Modal */}
      <ApplicationAcceptanceSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onSendInvite={handleSendInvite}
        students={acceptedStudents}
        parentEmail={application.guardianEmail}
        parentName={application.guardianName}
      />
    </div>
  )
}
