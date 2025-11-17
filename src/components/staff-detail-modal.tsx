'use client'

import { useState, useEffect } from 'react'
import { PhoneLink } from './phone-link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  GraduationCap,
  Copy,
  Edit,
  Archive,
  X
} from 'lucide-react'

interface StaffDetail {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  classes: Array<{
    id: string
    name: string
    students: number
  }>
  _count: {
    classes: number
  }
}

interface StaffDetailModalProps {
  staff: StaffDetail | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (staffId: string) => void
  onArchive?: (staffId: string, staffName: string) => void
}

export function StaffDetailModal({ 
  staff, 
  isOpen, 
  onClose, 
  onEdit,
  onArchive
}: StaffDetailModalProps) {
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !staff) return null

  const handleEdit = () => {
    if (onEdit) {
      onEdit(staff.id)
    }
    onClose()
  }

  const handleArchive = () => {
    setIsArchiveDialogOpen(true)
  }

  const handleConfirmArchive = async () => {
    setIsArchiving(true)
    try {
      if (onArchive) {
        await onArchive(staff.id, staff.name)
      }
      setIsArchiveDialogOpen(false)
      onClose()
    } catch (error) {
      console.error('Error archiving staff:', error)
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="w-full max-w-4xl my-8">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#eef2ff] dark:bg-blue-950">
                      <User className="h-5 w-5 text-[#1d4ed8] dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                        {staff.name}
                      </h2>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Staff Member
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        staff.isActive
                          ? 'bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9] dark:bg-green-950 dark:text-green-200 dark:border-green-800'
                          : 'bg-[#f5f5f5] text-[#374151] border border-[#e5e7eb] dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                      }
                    >
                      {staff.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-[var(--accent)] transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4 text-[var(--muted-foreground)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Staff Information */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <User className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Staff Information</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Mail className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Phone className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                          <PhoneLink phone={staff.phone} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <span className="font-mono truncate">{staff.username}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Shield className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                          <span>Login: {staff.isActive ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Classes */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <GraduationCap className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Assigned Classes ({staff._count.classes})</h3>
                    <div>
                      {staff.classes.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Class Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Students</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {staff.classes.map((classItem, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <span className="truncate">{classItem.name}</span>
                                      <span className="text-sm text-[var(--muted-foreground)] sm:hidden">{classItem.students} students</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {classItem.students} students
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--muted-foreground)] mx-auto mb-3 sm:mb-4" />
                          <h3 className="text-base sm:text-lg font-medium text-[var(--foreground)] mb-2">No classes assigned</h3>
                          <p className="text-sm sm:text-base text-[var(--muted-foreground)]">This staff member is not assigned to any classes yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Login Credentials</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-[var(--muted-foreground)]">Email</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs sm:text-sm bg-[var(--accent)] px-2 py-1 rounded flex-1 min-w-0 truncate text-[var(--foreground)]">
                            {staff.email || staff.username}
                          </span>
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-[var(--border)]">
                        <p className="text-xs text-[var(--muted-foreground)] mb-2">
                          Passwords are private and cannot be viewed. Users can reset their own passwords via the forgot password link.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Statistics */}
              <div className="border border-[var(--border)] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Shield className="h-5 w-5 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Staff Statistics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--muted-foreground)]">Total Classes</span>
                        <Badge variant="secondary">
                          {staff._count.classes}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--muted-foreground)]">Total Students</span>
                        <Badge variant="secondary">
                          {staff.classes.reduce((sum, c) => sum + c.students, 0)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--muted-foreground)]">Account Status</span>
                        <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                          {staff.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[var(--muted-foreground)]">Member Since</span>
                        <span className="text-sm text-[var(--foreground)]">
                          {staff.createdAt ? (staff.createdAt instanceof Date ? staff.createdAt.toLocaleDateString() : new Date(staff.createdAt).toLocaleDateString()) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-[var(--border)]">
                <Button variant="outline" onClick={handleEdit} className="flex-1 w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Edit Staff</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
                <Button variant="destructive" onClick={handleArchive} className="flex-1 w-full sm:w-auto">
                  <Archive className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Archive Staff</span>
                  <span className="sm:hidden">Archive</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleConfirmArchive}
        title="Archive Staff Member"
        message={`Are you sure you want to archive ${staff.name}? This will disable their account and remove them from active staff.`}
        confirmText="Archive Staff"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isArchiving}
      />
    </>
  )
}
