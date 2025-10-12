'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { SetPasswordModal } from '@/components/set-password-modal'
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Shield, 
  GraduationCap,
  Copy,
  Eye,
  EyeOff,
  Edit,
  Archive
} from 'lucide-react'

interface StaffDetail {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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
  const [showPassword, setShowPassword] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  if (!staff) return null

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

  const handleResetPassword = () => {
    setIsSetPasswordModalOpen(true)
  }

  const handleSetPassword = async (newPassword: string) => {
    setIsSettingPassword(true)
    try {
      console.log(`Setting new password for staff member: ${staff.id}`)
      console.log(`New password for ${staff.name}: ${newPassword}`)
      // TODO: Implement actual password set API call
      // For now, just log the action
      console.log(`Password set for ${staff.name} would be processed (demo mode)`)
    } catch (error) {
      console.error('Error setting password:', error)
    } finally {
      setIsSettingPassword(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Staff Details">
      <div className="max-h-[80vh] overflow-y-auto space-y-6">
        {/* Staff Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-xl font-medium text-gray-700">
                    {staff.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{staff.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                    {staff.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-gray-500">ID: {staff.id}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{staff.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{staff.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Key className="h-4 w-4" />
                <span className="font-mono">{staff.username}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Login: {staff.isActive ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Assigned Classes ({staff._count.classes})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staff.classes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.classes.map((classItem, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {classItem.name}
                      </TableCell>
                      <TableCell>
                        {classItem.students} students
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes assigned</h3>
                <p className="text-gray-500">This staff member is not assigned to any classes yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Login Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Username</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {staff.username}
                </span>
                <Button variant="ghost" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">Password</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {showPassword ? 'password123' : '••••••••'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleResetPassword}
              >
                Reset Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Classes</span>
              <Badge variant="secondary">
                {staff._count.classes}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Students</span>
              <Badge variant="secondary">
                {staff.classes.reduce((sum, c) => sum + c.students, 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Account Status</span>
              <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                {staff.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Member Since</span>
              <span className="text-sm text-gray-900">
                {staff.createdAt.toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleEdit} className="flex-1">
            <Edit className="h-4 w-4 mr-2" />
            Edit Staff
          </Button>
          <Button variant="destructive" onClick={handleArchive} className="flex-1">
            <Archive className="h-4 w-4 mr-2" />
            Archive Staff
          </Button>
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
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

      {/* Set Password Modal */}
      <SetPasswordModal
        isOpen={isSetPasswordModalOpen}
        onClose={() => setIsSetPasswordModalOpen(false)}
        onSetPassword={handleSetPassword}
        staffName={staff.name}
        isLoading={isSettingPassword}
      />
    </Modal>
  )
}
