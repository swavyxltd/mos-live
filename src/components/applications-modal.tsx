'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApplicationDetailModal } from '@/components/application-detail-modal'
import { Eye, Loader2, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PhoneLink } from '@/components/phone-link'

interface Application {
  id: string
  status: 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  guardianName: string
  guardianPhone: string
  guardianEmail: string
  submittedAt: string
  children: Array<{
    firstName: string
    lastName: string
    dob?: string
  }>
  preferredClass?: string
  additionalNotes?: string
  adminNotes?: string
}

interface ApplicationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApplicationsModal({ isOpen, onClose }: ApplicationsModalProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchApplications()
    }
  }, [isOpen])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        const transformed = data
          .map((app: any) => ({
            id: app.id,
            status: app.status || 'NEW',
            guardianName: app.guardianName || '',
            guardianPhone: app.guardianPhone || '',
            guardianEmail: app.guardianEmail || '',
            submittedAt: app.submittedAt || app.createdAt || new Date().toISOString(),
            children: (app.ApplicationChild || []).map((child: any) => ({
              firstName: child.firstName || '',
              lastName: child.lastName || '',
              dob: child.dob ? (typeof child.dob === 'string' ? child.dob : child.dob.toISOString().split('T')[0]) : undefined,
              gender: child.gender || ''
            })),
            preferredClass: app.preferredClass || '',
            additionalNotes: app.additionalNotes || '',
            adminNotes: app.adminNotes || ''
          }))
          .filter((app: Application) => app.status === 'NEW' || app.status === 'REVIEWED')
          .sort((a: Application, b: Application) => 
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
          )
        setApplications(transformed)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setSelectedApplication(null)
    fetchApplications() // Refresh list after action
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="default" className="bg-blue-500">New</Badge>
      case 'REVIEWED':
        return <Badge variant="default" className="bg-yellow-500">Reviewed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pending Applications"
        className="max-w-4xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm text-[var(--muted-foreground)]">No pending applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-[var(--muted-foreground)] mb-4">
              {applications.length} application{applications.length !== 1 ? 's' : ''} pending review
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Children</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.guardianName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {app.guardianEmail && (
                            <div className="text-sm">{app.guardianEmail}</div>
                          )}
                          {app.guardianPhone && (
                            <PhoneLink phone={app.guardianPhone} className="text-sm" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app.children.map((child, idx) => (
                          <div key={idx} className="text-sm">
                            {child.firstName} {child.lastName}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(new Date(app.submittedAt))}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewApplication(app)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={handleCloseDetail}
          onStatusChange={fetchApplications}
        />
      )}
    </>
  )
}

