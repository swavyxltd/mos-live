'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X,
  Edit,
  Mail,
  Phone,
  Building2,
  Calendar,
  User,
  Shield,
  Crown,
  UserCheck,
  Clock,
  MapPin,
  CreditCard,
  Lock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  emailVerified?: string | null
  image?: string | null
  phone?: string | null
  title?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  giftAidStatus?: string | null
  giftAidDeclaredAt?: string | null
  twoFactorEnabled: boolean
  role: string | null
  orgName?: string | null
  orgId?: string | null
  isSuperAdmin: boolean
  isArchived: boolean
  archivedAt?: string | null
  status: string
  createdAt: string
  updatedAt: string
  memberships?: Array<{
    role: string
    orgId: string
    orgName: string | null
    orgSlug: string | null
  }>
}

interface ViewUserModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit?: (userId: string) => void
  userId: string | null
}

export function ViewUserModal({ isOpen, onClose, onEdit, userId }: ViewUserModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    } else {
      setUser(null)
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/owner/users/${userId}`)
      if (!res.ok) {
        throw new Error('Failed to load user')
      }
      const data = await res.json()
      setUser(data)
    } catch (error) {
      toast.error('Failed to load user')
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string | null) => {
    if (!role) return <User className="h-3 w-3" />
    switch (role.toUpperCase()) {
      case 'OWNER':
        return <Crown className="h-3 w-3" />
      case 'ADMIN':
        return <Shield className="h-3 w-3" />
      case 'STAFF':
        return <UserCheck className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getRoleBadgeVariant = (role: string | null) => {
    if (!role) return 'secondary'
    switch (role.toUpperCase()) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      case 'STAFF':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
    >
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading user details...</p>
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Header with Edit button */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                {user.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => {
                  onEdit(user.id)
                  onClose()
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Key Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user.email}</span>
                {user.emailVerified && (
                  <CheckCircle className="h-3 w-3 text-green-500" title="Email verified" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Title: {user.title || 'Not provided'}</span>
              </div>
              {user.orgName && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{user.orgName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Address</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user.address || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user.city || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{user.postcode || 'Not provided'}</span>
              </div>
            </div>
          </div>

          {/* Gift Aid Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Gift Aid</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Status: {user.giftAidStatus || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Declared: {user.giftAidDeclaredAt ? formatDate(user.giftAidDeclaredAt) : 'Not declared'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Security</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Two-Factor Authentication: {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Role and Status */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                  {getRoleIcon(user.role)}
                  <span>{user.role || 'N/A'}</span>
                </Badge>
              </div>
            </div>
            {user.memberships && user.memberships.length > 1 && (
              <div>
                <label className="text-sm font-medium text-gray-700">All Memberships</label>
                <div className="mt-1 space-y-1">
                  {user.memberships.map((membership, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {membership.orgName} - {membership.role}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Joined: {formatDate(user.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Last updated: {formatDateTime(user.updatedAt)}</span>
            </div>
            {user.archivedAt && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Archived: {formatDateTime(user.archivedAt)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onEdit && (
              <Button onClick={() => {
                onEdit(user.id)
                onClose()
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500">User not found</p>
        </div>
      )}
    </Modal>
  )
}

